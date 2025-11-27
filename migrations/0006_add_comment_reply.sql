-- Migration number: 0006 	 2025-11-24T00:00:00.000Z
-- 添加评论回复支持
ALTER TABLE comments ADD COLUMN parent_id TEXT;

-- 创建索引以优化回复查询
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
