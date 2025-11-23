-- Migration number: 0004 	 2025-11-22T00:00:00.000Z
-- 添加评论数量字段到策略表

ALTER TABLE strategies ADD COLUMN comment_count INTEGER DEFAULT 0;

-- 更新现有策略的评论数量
UPDATE strategies
SET comment_count = (
  SELECT COUNT(*)
  FROM comments
  WHERE comments.strategy_id = strategies.id
);

-- 创建索引以优化按评论数排序
CREATE INDEX IF NOT EXISTS idx_strategies_comment_count ON strategies(comment_count DESC);
