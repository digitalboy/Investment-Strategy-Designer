### **后端数据模型与存储文档**

**版本**: 1.0
**适用平台**: Cloudflare D1 (SQLite) & Cloudflare KV
**编程语言**: TypeScript

---

#### **1. Cloudflare D1 数据库架构 (业务数据)**

D1 用于持久化存储用户账户信息和用户保存的策略。由于 SQLite 对 JSON 的支持良好，我们将复杂的策略配置（包含触发器逻辑）直接作为 JSON 字符串存储在 `TEXT` 字段中，这样既保持了灵活性，又简化了表结构。

##### **1.1. 用户表 (`users`)**

用于存储从 Firebase Auth 同步过来的用户身份信息。

- **SQL 定义**:

  ```sql
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,            -- UUID，后端生成的唯一主键
    firebase_uid TEXT NOT NULL,     -- Firebase 返回的唯一用户 ID (用于关联)
    email TEXT NOT NULL,            -- 用户邮箱
    created_at TEXT NOT NULL,       -- ISO 8601 时间字符串
    last_login_at TEXT,             -- 最后登录时间
    preferences TEXT                -- (可选) JSON 字符串，存储用户的主题偏好等
  );

  -- 创建索引以加快根据 Firebase UID 查找用户的速度
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
  ```

##### **1.2. 策略表 (`strategies`)**

用于存储用户设计并保存的投资策略。

- **SQL 定义**:

  ```sql
  CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY,            -- UUID
    user_id TEXT NOT NULL,          -- 外键，关联 users.id
    name TEXT NOT NULL,             -- 策略名称 (如 "QQQ抄底策略")
    description TEXT,               -- 策略描述
    config TEXT NOT NULL,           -- [核心] JSON 字符串，存储完整的策略定义
    is_public INTEGER DEFAULT 0,    -- 0: 私有, 1: 公开 (为未来社区功能预留)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 创建索引以加快获取某个用户的所有策略
  CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
  ```

  | 字段名         | 类型    | 说明                                                                          |
  | :------------- | :------ | :---------------------------------------------------------------------------- |
  | `id`           | TEXT    | 主键 (UUID)                                                                   |
  | `user_id`      | TEXT    | 外键，关联用户表                                                              |
  | `name`         | TEXT    | 策略名称                                                                      |
  | `description`  | TEXT    | 策略描述 (可选)                                                               |
  | `config`       | TEXT    | 策略配置 JSON (包含 ETF, 触发器等)                                            |
  | `is_public`    | INTEGER | **[新增]** 0: 私有, 1: 公开                                                   |
  | `metrics_json` | TEXT    | **[新增]** 缓存的关键指标 (CAGR, Sharpe 等)，用于排行榜快速排序，无需实时回测 |
  | `created_at`   | INTEGER | 创建时间戳                                                                    |
  | `updated_at`   | INTEGER | 更新时间戳                                                                    |

  - **关于 `config` 字段**: 这是一个巨大的 JSON 对象，包含了 `etfSymbol`, `initialCapital`, 和 `triggers` 数组。我们不在 SQL 层面拆分触发器，因为回测时总是需要读取完整的配置。

##### **1.3. 评论表 (`comments`) [新增]**

用于存储策略的评论和回复。

- **SQL 定义**:

  ```sql
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,            -- UUID
    strategy_id TEXT NOT NULL,      -- 外键，关联 strategies.id
    user_id TEXT NOT NULL,          -- 外键，关联 users.id (评论者)
    parent_id TEXT,                 -- 若为空，表示顶级评论；若不为空，指向父评论 ID
    content TEXT NOT NULL,          -- 评论内容
    created_at TEXT NOT NULL,       -- 创建时间
    FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_comments_strategy_id ON comments(strategy_id);
  ```

  | 字段名        | 类型    | 说明                                                                                           |
  | :------------ | :------ | :--------------------------------------------------------------------------------------------- |
  | `id`          | TEXT    | 主键 (UUID)                                                                                    |
  | `strategy_id` | TEXT    | 外键，关联策略表                                                                               |
  | `user_id`     | TEXT    | 外键，关联用户表 (评论者)                                                                      |
  | `parent_id`   | TEXT    | **核心字段**。若为空，表示这是一条顶级评论；若不为空，表示这是对某条评论的回复 (指向父评论 ID) |
  | `content`     | TEXT    | 评论内容                                                                                       |
  | `created_at`  | INTEGER | 创建时间戳                                                                                     |

---

#### **2. Cloudflare KV 数据模型 (缓存层)**

KV 用于缓存从雅虎财经获取的历史数据。这可以避免每次回测都调用外部 API，显著降低延迟并避免触发 API 速率限制。

- **命名空间 (Namespace)**: `MARKET_DATA_CACHE`

##### **2.1. ETF 历史数据**

- **Key 设计**: `ETF:<SYMBOL>`
  - 例如: `ETF:QQQ`, `ETF:SPY`
- **Value 结构**: 为了节省空间和解析速度，存储为压缩后的 JSON 字符串。
- **过期策略 (TTL)**: 设置为 `86400` 秒 (24 小时)。因为日线数据每天收盘才更新一次，无需永久存储。

- **Value 内容示例 (JSON)**:
  ```json
  {
    "symbol": "QQQ",
    "lastUpdated": "2025-11-19T16:00:00Z",
    "data": [
      {
        "d": "2020-01-01",
        "o": 213.5,
        "h": 214.0,
        "l": 212.0,
        "c": 213.8,
        "v": 3000000
      },
      {
        "d": "2020-01-02",
        "o": 214.0,
        "h": 215.5,
        "l": 213.5,
        "c": 215.2,
        "v": 3200000
      }
      // ... 更多历史数据
    ]
  }
  ```
  _注：为了减少 KV 存储体积，键名使用了缩写 (d=date, o=open, c=close 等)。_

---

#### **3. TypeScript 接口定义 (ORM 层)**

在后端代码 (`Cloudflare Worker`) 中，我们需要定义 TypeScript 接口来映射上述数据库结构，并为 JSON 字段提供强类型支持。

##### **3.1. 数据库实体接口 (DB Entities)**

这些接口对应 D1 数据库中的行数据。

```typescript
// 对应 users 表
export interface UserEntity {
  id: string;
  firebase_uid: string;
  email: string;
  created_at: string;
  last_login_at?: string;
  preferences?: string; // JSON string
}

// 对应 strategies 表
export interface StrategyEntity {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  config: string; // 注意：在数据库中是 JSON string，取出来后需要 JSON.parse
  is_public: number; // 0 or 1
  created_at: string;
  updated_at: string;
}
```

##### **3.2. 业务逻辑接口 (Domain Models)**

这些接口用于代码逻辑处理，特别是解析 `config` JSON 字段后的结构。

```typescript
// 策略配置对象 (StrategyEntity.config 解析后的类型)
export interface StrategyConfig {
  etfSymbol: string; // e.g., "QQQ"
  startDate?: string; // e.g., "2020-01-01" (回测时可选，保存时可能不存具体日期)
  endDate?: string;
  initialCapital: number; // e.g., 10000
  triggers: Trigger[]; // 触发器列表
}

// 触发器定义
export interface Trigger {
  condition: TriggerCondition;
  action: TriggerAction;
  cooldown?: {
    days: number; // 冷却期天数
  };
}

// 条件定义 (Union Type)
export type TriggerCondition =
  | {
      type: "priceStreak";
      params: { direction: "up" | "down"; count: number; unit: "day" | "week" };
    }
  | { type: "drawdownFromPeak"; params: { days: number; percentage: number } } // 核心：回撤
  | { type: "newHigh"; params: { days: number } }
  | {
      type: "rsi";
      params: {
        period: number;
        threshold: number;
        operator: "above" | "below";
      };
    }
  | {
      type: "maCross";
      params: { period: number; direction: "above" | "below" };
    }
  | {
      type: "vix";
      params: {
        threshold: number; // 阈值 (例如 30)
        operator: "above" | "below"; // 方向
      };
    };

// 动作定义
export interface TriggerAction {
  type: "buy" | "sell";
  value: {
    type:
      | "fixedAmount"
      | "cashPercent"
      | "positionPercent"
      | "totalValuePercent";
    amount: number; // 数值，根据 type 解释为金额或百分比
  };
}
```

##### **3.3. 数据传输对象 (DTOs)**

用于 API 请求和响应的数据结构。

```typescript
// GET /api/v1/strategies 的响应项
export interface StrategySummaryDTO {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

// POST /api/v1/strategies 的请求体
export interface CreateStrategyDTO {
  name: string;
  description?: string;
  config: StrategyConfig; // 直接传对象，后端负责 stringify 存入 DB
}

// 回测结果 DTO
export interface BacktestResultDTO {
  metadata: {
    symbol: string;
    period: string;
  };
  performance: {
    strategy: PerformanceMetrics;
    benchmark: PerformanceMetrics;
  };
  charts: {
    dates: string[];
    strategyEquity: number[];
    benchmarkEquity: number[];
    underlyingPrice: number[];
  };
}

interface PerformanceMetrics {
  totalReturn: number; // 百分比
  annualizedReturn: number; // 百分比
  maxDrawdown: number; // 百分比
  sharpeRatio: number;
}
```

---

#### **4. 数据操作流程示例**

1.  **保存策略**:

    - 前端发送 `CreateStrategyDTO` JSON 对象。
    - Worker 验证用户身份。
    - Worker 将 `DTO.config` 对象执行 `JSON.stringify()` 转换为字符串。
    - Worker 生成 UUID。
    - Worker 执行 `INSERT INTO strategies ...` 存入 D1。

2.  **读取策略**:

    - Worker 执行 `SELECT * FROM strategies WHERE id = ?`。
    - Worker 获取到 `config` 字段 (string)。
    - Worker 执行 `JSON.parse()` 将其还原为 `StrategyConfig` 对象。
    - Worker 将还原的对象放入响应体返回给前端。

3.  **获取行情 (缓存优先)**:
    - Worker 尝试 `await KV.get('ETF:QQQ', 'json')`。
    - **命中**: 直接使用数据。
    - **未命中**: 调用 `yahoo-finance2` API 下载数据 -> 压缩字段名 -> `await KV.put('ETF:QQQ', JSON.stringify(data), { expirationTtl: 86400 })` -> 使用数据。
