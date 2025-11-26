### **后端 API 端点规划文档**

**版本**: v2.1 (Final)
**基础 URL**: `https://<your-worker-subdomain>.workers.dev/api/v1`
**认证方式**: Bearer Token (Firebase JWT)

---

#### **1. 通用规范 (General Standards)**

- **认证 (Authentication)**:

  - 所有涉及用户数据（保存、读取策略）的端点，必须在 Header 中包含 Firebase 生成的 Token。
  - 格式: `Authorization: Bearer <FIREBASE_ID_TOKEN>`
  - 回测端点 (`/backtest`) 可选认证，但建议加上以备未来扩展（如速率限制）。

- **日期格式**: ISO 8601 格式字符串 (`YYYY-MM-DD` 或 `YYYY-MM-DDTHH:mm:ssZ`)。

- **错误响应 (Error Response)**:
  所有 4xx/5xx 错误统一返回如下格式：
  ```json
  {
    "error": {
      "code": "INVALID_TOKEN", // 机器可读错误码
      "message": "The provided authentication token is expired." // 人类可读消息
    }
  }
  ```

---

#### **2. 核心业务端点 (Core Logic)**

这是系统的核心，负责执行策略计算。**注意：此端点内部封装了从雅虎财经获取数据和 KV 缓存的逻辑，不暴露单独的数据获取 API。**

##### **执行策略回测**

- **方法**: `POST`
- **路径**: `/backtest`
- **描述**: 接收策略定义，后端自动获取/读取缓存的 ETF 数据，执行回测，并返回完整的分析报告（含图表数据）。
- **请求体 (JSON)**:
  ```json
  {
    "etfSymbol": "QQQ",
    "startDate": "2020-01-01",
    "endDate": "2024-12-31",
    "initialCapital": 10000,
    "triggers": [
      {
        // 触发器定义
        "condition": {
          "type": "drawdownFromPeak",
          "params": { "days": 60, "percentage": 15 }
        },
        "action": {
          "type": "buy",
          "value": { "type": "fixedAmount", "amount": 1000 }
        },
        "cooldown": { "days": 5 }
      }
    ]
  }
  ```
- **成功响应 (200 OK)**:
  _包含了前端绘制“净值曲线”和“标的价格图”所需的所有数据。_
  ```json
  {
    "metadata": {
      "symbol": "QQQ",
      "period": "2020-01-01 to 2024-12-31"
    },
    "performance": {
      "strategy": {
        "totalReturn": 85.5,      // %
        "annualizedReturn": 16.2, // %
        "maxDrawdown": -22.4,     // %
        "sharpeRatio": 0.85
      },
      "benchmark": { // 买入并持有策略
        "totalReturn": 70.1,
        "annualizedReturn": 14.5,
        "maxDrawdown": -33.0
      }
    },
    "charts": {
      // 每日数据点，用于前端画图
      "dates": ["2020-01-01", "2020-01-02", ...],
      "strategyEquity": [10000, 10050, ...],  // 策略净值曲线
      "benchmarkEquity": [10000, 9980, ...],  // 基准净值曲线
      "underlyingPrice": [210.5, 212.0, ...]  // ETF 自身价格曲线 (新增，满足前端展示需求)
    }
  }
  ```

---

#### **3. 用户管理端点 (User Management)**

##### **同步用户状态**

- **方法**: `POST`
- **路径**: `/users/sync`
- **描述**: 前端 Firebase 登录成功后立即调用。后端验证 Token，若 D1 数据库中无此用户则自动创建，若有则返回用户信息。
- **认证**: **必需**
- **请求体**: 空
- **成功响应 (200 OK)**:
  ```json
  {
    "id": "user_123456789", // D1 数据库内部 ID
    "firebaseUid": "firebase_uid_abc",
    "email": "alex@example.com",
    "createdAt": "2025-11-19T10:00:00Z"
  }
  ```

---

#### **4. 策略管理端点 (Strategy CRUD)**

用于已登录用户保存和管理他们的自定义策略，以及公开策略的浏览。

##### **A. 保存新策略**

- **方法**: `POST`
- **路径**: `/strategies`
- **认证**: **必需**
- **请求体 (JSON)**:
  ```json
  {
    "name": "QQQ 抄底增强策略",
    "description": "基于60日回撤的定投增强方案",
    "config": { ... }, // 完整的策略配置对象 (与 /backtest 请求体一致)
    "is_public": true // [新增] 是否公开 (默认 false)
  }
  ```
- **成功响应 (201 Created)**:
  ```json
  {
    "id": "strat_xyz_789",
    "name": "QQQ 抄底增强策略",
    "createdAt": "2025-11-19T10:30:00Z"
  }
  ```

##### **B. 获取策略列表 (摘要)**

- **方法**: `GET`
- **路径**: `/strategies`
- **描述**: 获取当前用户的所有策略列表。为了节省带宽，**不返回**具体的配置细节，只返回元数据。
- **认证**: **必需**
- **成功响应 (200 OK)**:
  ```json
  [
    {
      "id": "strat_xyz_789",
      "name": "QQQ 抄底增强策略",
      "description": "...",
      "is_public": 1,
      "createdAt": "..."
    }
  ]
  ```

##### **C. 获取公开策略列表 (排行榜) [新增]**

- **方法**: `GET`
- **路径**: `/strategies/public`
- **描述**: 获取所有公开的策略列表，支持排序。
- **认证**: **可选** (公开访问)
- **参数**:
  - `sort_by`: `return` (回报率), `sharpe` (夏普比率), `created_at` (最新)。
  - `limit`: 返回数量限制。
  - `offset`: 分页偏移量。
- **成功响应 (200 OK)**:
  ```json
  [
    {
      "id": "strat_abc_123",
      "name": "SPY 稳健增长",
      "author": "User123",
      "metrics": { "annualizedReturn": 12.5, "sharpeRatio": 1.2 },
      "createdAt": "..."
    }
  ]
  ```

##### **D. 获取单个策略详情**

- **方法**: `GET`
- **路径**: `/strategies/:id`
- **描述**: 获取指定策略的完整配置。
- **认证**:
  - 若策略为公开 (`is_public=1`)：**无需认证**。
  - 若策略为私有 (`is_public=0`)：**必需**，且必须是策略拥有者。
- **成功响应 (200 OK)**:
  ```json
  {
    "id": "strat_xyz_789",
    "name": "QQQ 抄底增强策略",
    "config": { ... }, // 完整的配置 JSON
    "is_public": 1,
    "createdAt": "..."
  }
  ```

##### **E. 更新策略**

- **方法**: `PUT`
- **路径**: `/strategies/:id`
- **认证**: **必需** (仅限拥有者)
- **请求体**: 同 POST。

##### **F. 删除策略**

- **方法**: `DELETE`
- **路径**: `/strategies/:id`
- **认证**: **必需** (仅限拥有者)

---

#### **5. 社交互动端点 (Social Interaction) [新增]**

##### **A. 获取评论列表**

- **方法**: `GET`
- **路径**: `/strategies/:id/comments`
- **认证**: **可选** (公开访问)
- **成功响应 (200 OK)**:
  ```json
  [
    {
      "id": "comment_1",
      "user_id": "user_a",
      "user_name": "Alice",
      "content": "这个策略很棒！",
      "created_at": "...",
      "replies": [ ... ] // 嵌套回复
    }
  ]
  ```

##### **B. 发表评论/回复**

- **方法**: `POST`
- **路径**: `/strategies/:id/comments`
- **认证**: **必需**
- **请求体**:
  ```json
  {
    "content": "请问回撤控制在多少比较合适？",
    "parent_id": "comment_1" // 可选，若是回复则填父评论ID
  }
  ```

##### **C. 删除评论**

- **方法**: `DELETE`
- **路径**: `/comments/:id`
- **认证**: **必需** (仅限评论作者或策略拥有者)
  ```json
  [
    {
      "id": "strat_xyz_789",
      "name": "QQQ 抄底增强策略",
      "description": "基于60日回撤...",
      "updatedAt": "2025-11-19T10:30:00Z"
    },
    {
      "id": "strat_abc_123",
      "name": "SPY 稳健定投",
      "description": "无脑月定投",
      "updatedAt": "2025-10-01T09:00:00Z"
    }
  ]
  ```

##### **C. 获取单个策略详情**

- **方法**: `GET`
- **路径**: `/strategies/:id`
- **描述**: 获取某个策略的完整配置，通常用于在前端编辑器中加载该策略。
- **认证**: **必需**
- **成功响应 (200 OK)**:
  ```json
  {
    "id": "strat_xyz_789",
    "name": "QQQ 抄底增强策略",
    "description": "基于60日回撤的定投增强方案",
    "config": {
      "etfSymbol": "QQQ",
      "initialCapital": 10000,
      "triggers": [ ... ]
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```

##### **D. 更新策略**

- **方法**: `PUT`
- **路径**: `/strategies/:id`
- **描述**: 全量更新某个策略的配置。
- **认证**: **必需**
- **请求体**: 同 `POST /strategies`。
- **成功响应 (200 OK)**: 返回更新后的策略摘要。

##### **E. 删除策略**

- **方法**: `DELETE`
- **路径**: `/strategies/:id`
- **认证**: **必需**
- **成功响应 (204 No Content)**: 无响应体。

---

#### **4. 策略管理 (Strategy Management)**

- `GET /strategies/public` **[新增]**

  - **描述**: 获取公开策略列表（排行榜）。
  - **权限**: 公开 (无需 Token)。
  - **参数**: `sort_by` (return, sharpe), `limit`, `offset`。

- `GET /strategies/:id`
  - **描述**: 获取单个策略详情。
  - **权限**:
    - 如果策略是公开的 -> 任何人可访问。
    - 如果策略是私有的 -> 仅拥有者可访问 (需验证 Token)。

---

#### **5. 社交互动 (Social Interaction) [新增]**

- `GET /strategies/:id/comments`

  - **描述**: 获取指定策略的评论列表。
  - **逻辑**: 后端通常会处理成树状结构返回，或者按时间顺序返回扁平列表由前端组装。
  - **权限**: 公开。

- `POST /strategies/:id/comments`

  - **描述**: 发表评论或回复。
  - **权限**: 需验证 Token。
  - **Body**:
    ```json
    {
      "content": "这个策略在熊市表现如何？",
      "parent_id": "optional_uuid_of_parent_comment" // 如果是回复，填此字段
    }
    ```

- `DELETE /comments/:id`
  - **描述**: 删除评论。
  - **权限**: 需验证 Token (仅限评论作者或策略拥有者)。

---

### **设计总结**

1.  **高效性**: 只有 `/backtest` 这一个“重型”端点。它一次性完成了数据获取、清洗、计算和结果打包。
2.  **前端友好**: `/backtest` 的响应直接提供了前端图表组件 (`charts` 字段) 所需的数组数据，前端几乎不需要进行额外的数据处理。
3.  **安全性**: 所有敏感操作都受 Firebase Token 保护，后端 Worker 负责验证 Token 有效性并匹配 D1 数据库中的用户记录.
