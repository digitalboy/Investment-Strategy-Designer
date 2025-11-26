# 回测引擎核心算法与设计

**版本**: 1.1 (Integrated)
**最后更新**: 2025 年 11 月 26 日
**状态**: 核心逻辑重构中

本文档详细论述了 ETF 投资策略设计器的回测引擎核心算法。它涵盖了从数据处理、信号生成到交易执行的完整生命周期。

## 1. 算法概述

回测引擎的目标是模拟策略在历史市场数据上的表现。我们的设计哲学是**“基于事件的日线级回测”**。

- **输入**: 
  - `StrategyConfig`: 用户定义的策略配置。
  - `ETFData`: 清洗后的 ETF 历史数据。
  - `MarketContext` (可选): 市场上下文数据，如 VIX 恐慌指数，用于宏观择时策略。
- **处理**: 按时间顺序遍历每一天，根据当日及历史数据判断是否触发交易信号。
- **输出**: 包含资金曲线、交易记录和绩效指标的详细报告 (`BacktestResultDTO`)。

## 2. 核心逻辑流程

回测的核心是一个按日期推进的时间步进循环 (Time-Stepping Loop)。

### 2.1 数据预处理

1.  **排序**: 确保 ETF 数据严格按日期升序排列。
2.  **过滤**: 根据策略设定的 `startDate` 和 `endDate` 截取数据片段。
3.  **初始化**: 建立初始账户状态（现金 = 初始资本，持仓 = 0）。
4.  **上下文构建**: 如果提供了 `MarketContext` (如 VIX 数据)，将其转换为 `Map` 结构以便于 O(1) 查找。

### 2.2 逐日回测循环 (The Loop)

对于回测区间内的每一天 $T$：

1.  **更新账户价值**:

    - 根据 $T$ 日收盘价 ($Close_T$) 更新持仓市值。
    - $TotalValue_T = Cash + (Positions 	imes Close_T)$。
    - 记录当日账户快照。

2.  **执行待处理订单 (Order Execution)**:

    - **目标逻辑**: 检查是否有 $T-1$ 日产生的交易信号。如果有，以 $T$ 日的 **开盘价 ($Open_T$)** 执行交易。这是消除“前视偏差”的关键。

3.  **信号检测 (Signal Generation)**:

    - 基于 $T$ 日收盘数据 ($Close_T, High_T, Low_T$) 及历史窗口数据，计算技术指标（如 MA, RSI, 回撤幅度）。
    - **获取上下文数据**: 尝试获取当日的外部数据（如 VIX 指数）。
    - 遍历策略中的所有触发器 (`Triggers`)。
    - 若满足条件且不在冷却期内，生成交易信号。

4.  **状态流转**:
    - 更新触发器的“最后执行时间”。
    - 将信号转换为待处理订单，传入 $T+1$ 日。

## 3. 详细机制

### 3.1 触发器系统 (Trigger System)

引擎支持模块化的触发条件，通过 `checkTriggerCondition` 分发：

- **Drawdown**: 从近期高点的回撤幅度。
- **Price Streak**: 连续 N 天涨/跌。
- **New High/Low**: 创 N 日新高/新低。
- **MA Cross**: 均线交叉（金叉/死叉）。
- **RSI**: 超买/超卖检测。
- **VIX** (新增): 基于市场恐慌指数的判断。

#### VIX 判断逻辑示例
```typescript
private checkTriggerCondition(trigger: Trigger, ..., currentVix?: number): boolean {
    if (trigger.condition.type === 'vix') {
        // 守卫子句：如果策略依赖 VIX 但当天没有 VIX 数据，默认不触发
        if (currentVix === undefined) return false;
        return trigger.condition.params.operator === 'above' 
            ? currentVix > trigger.condition.params.threshold
            : currentVix < trigger.condition.params.threshold;
    }
    // ... 其他逻辑
}
```

### 3.2 交易执行与资金管理

交易动作定义了“买什么”和“卖多少”。

- **买入 (Buy)**:
  - `fixedAmount`: 固定金额买入。
  - `cashPercent`: 使用当前现金的 X% 买入。
  - `totalValuePercent`: 目标仓位管理（例如：加仓至总资产的 50%）。
- **卖出 (Sell)**:
  - `fixedAmount`: 卖出指定价值的份额。
  - `positionPercent`: 卖出当前持仓的 X%。
  - `totalValuePercent`: 减仓至总资产的 X%。

## 4. 缺陷分析与修正方案 (Critical Fixes)

为了确保回测结果的真实性，必须对当前算法进行以下核心修正。

### 4.1 消除“穿越未来”偏差 (Look-ahead Bias)

- **现状**: 在第 $T$ 日收盘后计算出信号，并立即以第 $T$ 日收盘价成交。
- **修正方案**:
  - **信号生成**: 保持在 $T$ 日收盘后进行。
  - **交易执行**: 强制推迟到 $T+1$ 日。
  - **成交价格**: 使用 $T+1$ 日的 **Open Price**。

### 4.2 卖出逻辑 Bug 修复

- **修正**: `calculateSellQuantity` 中 `fixedAmount` 模式应计算为 `amount / currentPrice`，即“想卖出的金额除以当前单价”得到股数。

## 5. 基准策略 (Benchmarks)

系统内置两种基准策略用于对比分析。

### 5.1 买入并持有 (Buy and Hold)
在回测第一天用全部初始资金买入 ETF，并持有到最后一天。这是最基本的对比基准。

### 5.2 周定投 (Weekly DCA - Capital Depletion Model)
用于模拟一个**零择时、完全被动、但资金利用率最大化**的投资策略。

#### 核心逻辑
与用户可能设置的“每次固定投 100 元”不同，本基准采用**“资本耗尽模型”**。
1.  **资金分配**:
    - 扫描回测区间，统计总周数 ($N$)。
    - 计算周定投额 ($A = 	ext{Initial Capital} / N$)。
2.  **交易执行**:
    - 在遍历每日数据时，检测 `Week Identifier` 变化（即每周第一个交易日）。
    - 买入金额为 $A$。如果是最后一周，则买入剩余所有现金（消除浮点数误差）。
3.  **意义**:
    - 消除因“本金未花完”导致的现金拖累（Cash Drag）误差。
    - 提供一个公平的“如果你把这笔钱平摊到每一周去买”的收益率对比标准。

## 6. 未来演进 (Roadmap)

### 6.1 交易摩擦 (Friction)
- 引入佣金 (`commission`) 和滑点 (`slippage`) 模型，使高频策略的成本更真实。

### 6.2 现金流管理
- **股息 (Dividends)**: 支持股息再投资或现金派发。
- **闲置资金利息**: 为空仓部分的现金计算无风险收益 (Risk-Free Rate)。

### 6.3 高级风控
- **止损/止盈 (Stop Loss / Take Profit)**: 独立于入场信号的退出逻辑，支持移动止损 (Trailing Stop)。