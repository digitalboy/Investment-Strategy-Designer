
### **后端 API 端点规划文档**

**版本**: v2.1 (Final)
**基础 URL**: `https://<your-worker-subdomain>.workers.dev/api/v1`
**认证方式**: Bearer Token (Firebase JWT)

---

#### **1. 通用规范 (General Standards)**

*   **认证 (Authentication)**:
    *   所有涉及用户数据（保存、读取策略）的端点，必须在 Header 中包含 Firebase 生成的 Token。
    *   格式: `Authorization: Bearer <FIREBASE_ID_TOKEN>`
    *   回测端点 (`/backtest`) 可选认证，但建议加上以备未来扩展（如速率限制）。

*   **日期格式**: ISO 8601 格式字符串 (`YYYY-MM-DD` 或 `YYYY-MM-DDTHH:mm:ssZ`)。

*   **错误响应 (Error Response)**:
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
*   **方法**: `POST`
*   **路径**: `/backtest`
*   **描述**: 接收策略定义，后端自动获取/读取缓存的 ETF 数据，执行回测，并返回完整的分析报告（含图表数据）。
*   **请求体 (JSON)**:
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
*   **成功响应 (200 OK)**:
    *包含了前端绘制“净值曲线”和“标的价格图”所需的所有数据。*
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
*   **方法**: `POST`
*   **路径**: `/users/sync`
*   **描述**: 前端 Firebase 登录成功后立即调用。后端验证 Token，若 D1 数据库中无此用户则自动创建，若有则返回用户信息。
*   **认证**: **必需**
*   **请求体**: 空
*   **成功响应 (200 OK)**:
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

用于已登录用户保存和管理他们的自定义策略。

##### **A. 保存新策略**
*   **方法**: `POST`
*   **路径**: `/strategies`
*   **认证**: **必需**
*   **请求体 (JSON)**:
    ```json
    {
      "name": "QQQ 抄底增强策略",
      "description": "基于60日回撤的定投增强方案",
      "config": { ... } // 完整的策略配置对象 (与 /backtest 请求体一致)
    }
    ```
*   **成功响应 (201 Created)**:
    ```json
    {
      "id": "strat_xyz_789",
      "name": "QQQ 抄底增强策略",
      "createdAt": "2025-11-19T10:30:00Z"
    }
    ```

##### **B. 获取策略列表 (摘要)**
*   **方法**: `GET`
*   **路径**: `/strategies`
*   **描述**: 获取当前用户的所有策略列表。为了节省带宽，**不返回**具体的配置细节，只返回元数据。
*   **认证**: **必需**
*   **成功响应 (200 OK)**:
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
*   **方法**: `GET`
*   **路径**: `/strategies/:id`
*   **描述**: 获取某个策略的完整配置，通常用于在前端编辑器中加载该策略。
*   **认证**: **必需**
*   **成功响应 (200 OK)**:
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
*   **方法**: `PUT`
*   **路径**: `/strategies/:id`
*   **描述**: 全量更新某个策略的配置。
*   **认证**: **必需**
*   **请求体**: 同 `POST /strategies`。
*   **成功响应 (200 OK)**: 返回更新后的策略摘要。

##### **E. 删除策略**
*   **方法**: `DELETE`
*   **路径**: `/strategies/:id`
*   **认证**: **必需**
*   **成功响应 (204 No Content)**: 无响应体。

---

### **设计总结**

1.  **高效性**: 只有 `/backtest` 这一个“重型”端点。它一次性完成了数据获取、清洗、计算和结果打包。
2.  **前端友好**: `/backtest` 的响应直接提供了前端图表组件 (`charts` 字段) 所需的数组数据，前端几乎不需要进行额外的数据处理。
3.  **安全性**: 所有敏感操作都受 Firebase Token 保护，后端 Worker 负责验证 Token 有效性并匹配 D1 数据库中的用户记录。