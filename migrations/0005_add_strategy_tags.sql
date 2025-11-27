-- Migration number: 0005 	 2025-11-23T00:00:00.000Z
-- Add tags column to strategies table
ALTER TABLE strategies ADD COLUMN tags TEXT;

-- Create index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_strategies_tags ON strategies(tags);
