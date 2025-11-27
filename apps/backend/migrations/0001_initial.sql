-- Migration number: 0001 	 2025-11-21T00:00:00.000Z
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  preferences TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- 创建策略表
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL,
  is_public INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  clone_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_is_public ON strategies(is_public);
CREATE INDEX IF NOT EXISTS idx_strategies_like_count ON strategies(like_count DESC);

-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_strategy_id ON comments(strategy_id);

-- 创建点赞表 (用于防止重复点赞)
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, strategy_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);
