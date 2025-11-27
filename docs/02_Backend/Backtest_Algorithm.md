# 回测算法详解 (Backtest Algorithm)

## 1. 概述
回测引擎是后端服务的核心组件，负责模拟策略在历史数据上的表现。
它接收策略配置和历史市场数据，输出详细的性能指标、交易记录和图表数据。

**位置**: `src/lib/backtest-engine.ts` 及相关辅助模块 (`position-sizer.ts`, `performance-analyzer.ts`)

## 2. 回测流程

### 2.1 初始化
1.  **资金池**: 创建 `AccountState` 对象，设置初始现金（例如 $10,000）。
2.  **数据对齐**: 获取 ETF 历史数据 (OHLCV)，并根据策略配置的 `startDate` 和 `endDate` 进行切片。
3.  **上下文准备**: 如果策略依赖 VIX 数据，将 VIX 数据与 ETF 数据按日期对齐。

### 2.2 时间步进循环 (Time-Stepping Loop)
引擎按天遍历历史数据，每天执行以下步骤：

#### A. 盘前/开盘处理
*   **执行待处理订单 (Pending Orders)**:
    *   检查上一日产生的交易信号。
    *   使用 **当日开盘价 (Open Price)** 执行买入或卖出操作。
    *   更新现金和持仓数量。
    *   *原因*: 模拟“见信号次日开盘操作”的真实交易场景。

#### B. 盘中/收盘结算
*   **更新账户价值**:
    *   `Total Value = Cash + (Positions * Current Close Price)`
*   **记录快照**: 保存当日的账户状态用于生成权益曲线。

#### C. 盘后/信号检测
*   **指标计算**: 使用 `IndicatorEngine` 计算当日指标（如 RSI, 均线, 连涨天数）。
*   **触发器检查**:
    *   遍历策略中的每个 `Trigger`。
    *   **冷却期检查**: 检查该规则上次触发距离今天是否满足冷却天数。
    *   **条件判断**: 如果满足条件（例如 "RSI < 30"），生成一个 **待处理订单**。
    *   *注意*: 信号基于 **当日收盘价 (Close Price)** 计算，操作将在 **次日开盘** 执行。

## 3. 性能指标计算

所有指标计算逻辑封装在 `src/lib/performance-analyzer.ts` 中。

### 3.1 核心指标
*   **总回报率 (Total Return)**: `(Final Value - Initial Capital) / Initial Capital * 100%`
*   **年化回报率 (CAGR)**: `(Final / Initial) ^ (1 / Years) - 1`
*   **最大回撤 (Max Drawdown)**: 历史净值曲线中从最高点下跌的最大百分比幅度的负值。
*   **夏普比率 (Sharpe Ratio)**: `(Avg Daily Return - RiskFreeRate) / StdDev of Daily Returns * sqrt(252)` (假设无风险利率为0)。

### 3.2 基准对比 (Benchmarks)
为了评估策略优劣，我们计算两个基准：
1.  **买入持有 (Buy & Hold)**: 假设第一天全仓买入 ETF 并持有至最后一天。
2.  **周定投 (Weekly DCA)**: 假设将初始资金分成 N 份（N=总周数），每周一固定金额买入。
    *   *算法细节*: 采用“资本耗尽模型”，确保回测结束时资金刚好投完，避免现金拖累导致的计算误差。

## 4. 深度风险分析：Top Drawdowns (最大回撤事件)

除了计算单一的“最大回撤”数值外，我们还采用 **Underwater Algorithm (水下算法)** 识别策略历史上所有显著的回撤事件，并按跌幅排名。这能帮助用户了解策略在特定历史危机（如 2008 金融危机、2020 疫情熔断）中的具体表现及恢复时间。

### 4.1 核心定义

一个完整的 **回撤事件 (Drawdown Event)** 包含三个关键节点：
1.  **峰值 (Peak)**: 资金曲线创新高的日期（回撤开始）。
2.  **谷底 (Valley)**: 在恢复创新高之前，净值跌得最深的那一天。
3.  **恢复 (Recovery)**: 净值重新突破之前峰值的日期（回撤结束）。
    *   *未恢复状态*: 如果回测结束时净值仍低于峰值，标记为 `isRecovered: false`。

### 4.2 算法逻辑

算法以 $O(N)$ 复杂度遍历每日净值曲线：

1.  **初始化**: `runningMax = -Infinity`, `peakDate = null`, `currentDrawdown = null`.
2.  **遍历每一天**:
    *   **若当前净值 > `runningMax` (创新高)**:
        *   如果存在 `currentDrawdown`:
            *   标记该事件为已恢复 (`isRecovered = true`).
            *   记录恢复日期 (`recoveryDate`) 和恢复耗时 (`daysToRecover`).
            *   将事件存入结果列表（仅保留跌幅超过阈值 e.g. 1% 的事件）。
        *   更新 `runningMax` 和 `peakDate`。
        *   重置 `currentDrawdown`。
    *   **若当前净值 < `runningMax` (回撤中)**:
        *   计算当前跌幅: `depth = (Value - RunningMax) / RunningMax`.
        *   **若为新回撤**: 初始化一个新的回撤事件对象。
        *   **若为已有回撤**: 检查当前 `depth` 是否比记录的 `valleyDepth` 更深。如果是，更新 `valleyDate` 和 `valleyPrice`。
3.  **收尾**: 遍历结束后，如果仍有 `currentDrawdown`（未恢复），计算截至回测结束日的耗时，标记为 `isRecovered: false` 并存入列表。
4.  **排序**: 按 `depthPercent` 升序排序（负数越小越严重），取 Top 5 或 Top 10。

### 4.3 数据结构

```typescript
interface DrawdownEvent {
    rank: number;             // 排名 (1 = 最惨)
    depthPercent: number;     // 跌幅百分比 (e.g., -35.42)
    
    peakDate: string;         // 峰值日期
    peakPrice: number;        // 峰值时的净值
    
    valleyDate: string;       // 谷底日期
    valleyPrice: number;      // 谷底时的净值
    
    recoveryDate: string | null; // 恢复日期 (null 表示尚未恢复)
    daysToRecover: number;    // 恢复耗时 (天)
    
    isRecovered: boolean;     // 是否已爬出坑
}
```

## 5. 仓位管理 (Position Sizing)

由 `src/lib/position-sizer.ts` 处理。

*   **买入逻辑**:
    *   `fixedAmount`: 固定金额 (例如每次买 $1000)。
    *   `cashPercent`: 现金百分比 (例如用当前 50% 的现金买入)。
    *   `totalValuePercent`: 目标总仓位 (例如加仓直至持仓占总资产的 80%)。
    *   *保护机制*: 确保 `Amount to Spend <= Available Cash`。

*   **卖出逻辑**:
    *   `fixedAmount`: 卖出价值 $X 的份额。
    *   `positionPercent`: 卖出持仓的 X% (例如减仓一半)。
    *   `totalValuePercent`: 减仓直至持仓价值占总资产的 X%。

## 6. 局限性与假设
*   **无滑点与手续费**: 假设成交价等于开盘价/收盘价，不扣除交易费用。
*   **无分红再投资**: 数据源使用 Yahoo Finance 的 Adjusted Close (通常已包含分红调整)，但未显式模拟分红现金流。
*   **T+0 结算**: 假设卖出后现金立即到账可用。