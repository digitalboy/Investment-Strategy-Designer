-- Migration number: 0003 	 2025-11-21T00:00:00.000Z
-- Add performance metrics to strategies table
ALTER TABLE strategies ADD COLUMN return_rate REAL;
ALTER TABLE strategies ADD COLUMN max_drawdown REAL;
