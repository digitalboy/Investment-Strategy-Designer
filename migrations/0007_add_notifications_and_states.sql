-- Migration number: 0007 	 2025-11-26T00:00:00.000Z
-- Add notifications_enabled column to strategies table
ALTER TABLE strategies ADD COLUMN notifications_enabled INTEGER DEFAULT 0;

-- Create strategy_states table for real-time monitoring
CREATE TABLE IF NOT EXISTS strategy_states (
  strategy_id TEXT PRIMARY KEY,
  -- 核心字段：存储 KV 结构，精确到触发器索引
  -- 格式: { "trigger_0": "2025-11-25", "trigger_2": "2025-10-01" }
  last_execution_state TEXT, 
  updated_at TEXT NOT NULL,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);
