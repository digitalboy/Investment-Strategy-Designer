-- Migration number: 0002 	 2025-11-21T00:00:00.000Z
-- 添加用户昵称和头像字段
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN photo_url TEXT;
