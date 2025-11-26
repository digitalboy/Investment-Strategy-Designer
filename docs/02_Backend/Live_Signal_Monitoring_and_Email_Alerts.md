

# 功能需求文档：实盘信号监控与邮件预警系统

**项目名称**: ETF 投资策略设计器
**模块**: `AlertService` (预警服务)
**版本**: 1.0
**状态**: 待开发

## 1. 概述 (Overview)

本功能旨在将平台从一个“离线回测工具”升级为“实时市场监控助手”。系统将在每日美股收盘后，自动运行用户已保存的策略。如果市场数据（包括 ETF 价格和 VIX 恐慌指数）满足用户设定的**特定触发器条件**，系统将向用户发送邮件通知。

**核心原则**：
1.  **触发器独立性**：策略中的每个触发器（Trigger）都是独立的监控单元，拥有独立的冷却计时。
2.  **用户定义频率**：发送频率完全由用户在触发器中配置的 `cooldown`（冷却期）决定。
3.  **被动监控**：用户无需登录，系统自动在后台运行。

## 2. 用户故事 (User Stories)

为了确保开发符合用户真实场景，我们定义以下用户故事：

### 2.1 开启监控
*   **作为** 一名投资者 (Alex)，
*   **我想要** 在我的策略详情页点击一个“开启每日监控”的开关，
*   **以便** 系统开始自动在后台为我关注该策略的运行情况。

### 2.2 接收独立信号 (核心需求)
*   **作为** 一名投资者 (Alex)，
*   **我想要** 清楚地知道是**哪一条具体的规则**被触发了，
*   **以便** 我能区分是应该“大跌抄底”还是“RSI 超卖买入”，而不是收到一个模糊的“策略有信号”的通知。

### 2.3 冷却期控制 (防骚扰)
*   **作为** 一名投资者 (Alex)，
*   **我想要** 为我的“大跌抄底”规则设置 5 天的冷却期，但为我的“VIX 暴涨”规则设置 0 天冷却期，
*   **以便** 我不会因为连续几天的阴跌收到重复邮件，但在 VIX 连续暴涨的危机时刻每天都能收到警报。

### 2.4 邮件直达
*   **作为** 一名忙碌的上班族，
*   **我想要** 邮件中直接包含触发的标的、当前价格、触发原因和建议操作（买/卖多少），
*   **以便** 我不需要登录网站就能快速决定是否打开券商 APP 下单。

---

## 3. 功能需求说明 (Functional Requirements)

### 3.1 扫描机制 (Scanner)
*   **执行时间**：美股收盘后（建议北京时间每日 06:00）。
*   **触发方式**：Cloudflare Cron Triggers。
*   **数据范围**：获取标的（ETF & VIX）过去 365 天的历史数据（用于计算长周期均线或回撤）。

### 3.2 信号评估逻辑 (Evaluator Logic)
系统必须遍历策略中的每一个触发器，并执行以下**独立**判断逻辑：

1.  **条件检查**：基于最新收盘数据（T日），判断 `IF` 条件是否成立（含 VIX 判断）。
2.  **冷却检查 (Cooldown Check)**：
    *   读取该触发器上一次触发的日期 (`LastFiredDate`)。
    *   如果 `(Today - LastFiredDate) < CooldownDays`，则**拦截**该信号。
    *   如果用户未设置 Cooldown 或设为 0，则**不拦截**。
3.  **状态更新**：
    *   仅当信号**满足条件**且**通过冷却检查**时，更新该触发器的 `LastFiredDate` 为今天。

### 3.3 通知聚合 (Notification Aggregation)
*   虽然触发器是独立的，但为了避免用户体验割裂，如果同一策略在同一天有多个触发器同时激活：
    *   **必须合并为一封邮件发送**。
    *   邮件内容必须**分段展示**每个触发器的详情。

### 3.4 异常处理
*   **数据缺失**：如果 Yahoo Finance 数据源当天未更新（如节假日），Cron Job 应检测最新日期。如果最新日期不是“今天”或“上一交易日”，则不执行评估，直接跳过。

---

## 4. 数据库设计 (Schema Changes)

基于 Cloudflare D1。

### 4.1 策略表变更 (`strategies`)
新增字段以控制开关。

```sql
ALTER TABLE strategies ADD COLUMN notifications_enabled INTEGER DEFAULT 0; -- 0:关闭, 1:开启
```

### 4.2 策略状态表 (`strategy_states`) - 新增
用于记录每个触发器的“最后触发时间”，实现独立冷却。

```sql
CREATE TABLE IF NOT EXISTS strategy_states (
  strategy_id TEXT PRIMARY KEY,
  -- 核心字段：存储 KV 结构，精确到触发器索引
  -- 格式: { "trigger_0": "2025-11-25", "trigger_2": "2025-10-01" }
  last_execution_state TEXT, 
  updated_at TEXT NOT NULL
);
```

---

## 5. 邮件模板规范 (Email Template)

**发件人**: `InvestBot <alerts@your-domain.com>`
**标题格式**: `🔔 [信号触发] {策略名称} - {ETF代码}`

**正文结构**:

```html
<h1>策略监控日报</h1>
<p>检测时间: 2025-11-26 (美股收盘)</p>

<div class="card">
  <h2>📈 标的: QQQ</h2>
  <p>当前价格: $450.23 | VIX: 18.5</p>
</div>

<hr />

<h3>👇 以下规则已触发:</h3>

<!-- 循环渲染触发列表 -->
<div class="alert-box">
  <h4>🔴 规则 #1: 价格高点回撤 (Drawdown)</h4>
  <ul>
    <li><strong>条件:</strong> 60日内回撤 > 15%</li>
    <li><strong>当前值:</strong> 回撤 16.5%</li>
    <li><strong>建议操作:</strong> 买入 $1000</li>
  </ul>
</div>

<div class="alert-box">
  <h4>🟢 规则 #3: VIX 恐慌信号</h4>
  <ul>
    <li><strong>条件:</strong> VIX > 30</li>
    <li><strong>当前值:</strong> 32.1</li>
    <li><strong>建议操作:</strong> 买入 20% 现金</li>
  </ul>
</div>

<hr />
<p style="color: gray; font-size: 12px;">
  * 您收到此邮件是因为您开启了策略监控。
  <a href="...">关闭通知</a>
</p>
```

---

## 6. 开发任务分解 (Tasks)

1.  **数据库迁移**:
    *   创建 `strategy_states` 表。
    *   更新 `strategies` 表结构。
2.  **后端逻辑 (`SignalEvaluator`)**:
    *   编写从 `BacktestEngine` 剥离出的纯逻辑判断函数。
    *   实现 `evaluate(strategy, data, lastState)` 方法，返回 `triggeredIndices` 和 `newState`。
3.  **Cron Worker**:
    *   配置 `wrangler.toml` 添加 `[triggers] crons = ["0 22 * * 1-5"]` (根据时区调整)。
    *   编写批量扫描和数据预加载逻辑。
4.  **邮件服务**:
    *   集成 Resend SDK。
    *   实现 HTML 邮件模板渲染。
5.  **前端 UI**:
    *   在策略详情页增加“通知开关”。
    *   (可选) 在策略列表页增加“监控中”的徽标状态。

