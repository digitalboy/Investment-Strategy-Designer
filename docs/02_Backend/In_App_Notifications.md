# 功能需求文档：站内通知系统 (In-App Notifications)

**项目名称**: ETF 投资策略设计器
**模块**: `NotificationService`
**版本**: 1.0
**状态**: 待开发

## 1. 概述 (Overview)

为了让用户在不查看邮件的情况下也能及时获知策略运行状态，我们需要构建一个**站内通知系统**。该系统将与实盘监控服务 (`MonitorService`) 集成，在生成交易信号时，同步将消息持久化到数据库，并通过前端“铃铛”图标进行展示。

## 2. 核心逻辑

### 2.1 触发机制
通知的生成与邮件发送共享同一个触发源：`MonitorService.runDailyCheck`。
*   **时机**: 当 Cron Job 运行，检测到策略满足触发条件，且通过冷却期检查时。
*   **规则**:
    1.  **始终记录**: 无论用户是否开启了邮件通知 (`notifications_enabled`)，站内信**始终生成**。这作为策略运行的永久日志，供用户回溯。
    2.  **聚合发送**: 同一策略、同一日期的所有触发信号，合并为**一条**通知记录。

### 2.2 内容格式 (Snapshot)
由于触发器没有独立 ID，且策略配置可能随时修改，通知内容必须是**生成时刻的快照 (Snapshot)**。

*   **标题**: `🔔 信号触发: {策略名称}`
*   **内容**: 纯文本格式，清晰描述触发原因和操作建议。
    ```text
    [QQQ] 检测到 2 个交易信号：
    1. 规则 #1 (高点回撤): 60日回撤 > 15% (当前 -16.2%)。建议买入 $1000。
    2. 规则 #3 (VIX恐慌): VIX指数 > 30 (当前 32.5)。建议买入 20% 现金。
    ```

## 3. 数据库设计 (Database Schema)

新增表 `notifications`。

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,            -- UUID
  user_id TEXT NOT NULL,          -- 关联用户
  type TEXT DEFAULT 'signal',     -- 类型: signal, system
  title TEXT NOT NULL,            -- 简短标题
  content TEXT NOT NULL,          -- 详细内容 (Text)
  is_read INTEGER DEFAULT 0,      -- 0: 未读, 1: 已读
  metadata TEXT,                  -- JSON: { "strategyId": "...", "symbol": "..." }
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引：加速"我的消息"列表和未读数统计
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
```

## 4. API 接口设计

### 4.1 获取通知列表
*   **GET** `/api/v1/notifications`
*   **Auth**: Required
*   **Query Params**:
    *   `page`: 页码 (默认 1)
    *   `limit`: 每页数量 (默认 20)
*   **Response**:
    ```json
    {
      "items": [
        {
          "id": "uuid...",
          "title": "信号触发: QQQ 抄底策略",
          "content": "...",
          "isRead": false,
          "createdAt": "2025-11-27T21:15:00Z",
          "metadata": { "strategyId": "..." }
        }
      ],
      "unreadCount": 5, // 方便前端更新角标
      "hasMore": true
    }
    ```

### 4.2 标记已读 (单条)
*   **PUT** `/api/v1/notifications/:id/read`
*   **Auth**: Required
*   **Response**: 200 OK (返回更新后的 notification 对象)

### 4.3 标记全部已读
*   **PUT** `/api/v1/notifications/read-all`
*   **Auth**: Required
*   **Response**: 200 OK

## 5. 后端实现计划

1.  **Migration**: 创建 `notifications` 表。
2.  **NotificationService**:
    *   实现 `createNotification(userId, title, content, metadata)`。
    *   实现 `getUserNotifications(userId, page)`。
    *   实现 `markAsRead` 逻辑。
3.  **MonitorService 集成**:
    *   在 `checkStrategy` 循环中，收集所有触发信息。
    *   在保存 `strategy_states` 和发送邮件的同时，调用 `NotificationService.createNotification`。
4.  **Controller**:
    *   新增 `notificationController` 处理前端请求。

## 6. 前端对接建议

*   **Navbar**: 加载时调用 `GET /notifications` 获取 `unreadCount` 和最新几条消息。
*   **Polling**: 建议每 5-10 分钟静默刷新一次，或者在用户切换 Tab 回来时刷新。
*   **交互**: 点击通知项 -> 调用“标记已读”API -> 路由跳转到 `metadata.strategyId` 对应的策略详情页。
