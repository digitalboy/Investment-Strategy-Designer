-- Migration number: 0008     2025-11-27T00:00:00.000Z
-- Create notifications table for in-app messages

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
