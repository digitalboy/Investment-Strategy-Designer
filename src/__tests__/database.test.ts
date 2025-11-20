// src/__tests__/database.test.ts
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { DatabaseService } from '../lib/database';
import { UserEntity, StrategyEntity } from '../types';

// Mock D1Database
const mockD1Database = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
};

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService(mockD1Database as any);
    vi.clearAllMocks();
  });

  describe('User operations', () => {
    it('should create a user', async () => {
      const mockUser: UserEntity = {
        id: '1',
        firebase_uid: 'firebase123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      };

      (mockD1Database.prepare as Mock).mockReturnThis();
      (mockD1Database.bind as Mock).mockReturnThis();
      (mockD1Database.first as Mock).mockResolvedValue(mockUser);

      const result = await dbService.createUser('firebase123', 'test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockD1Database.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users')
      );
    });

    it('should get user by Firebase UID', async () => {
      const mockUser: UserEntity = {
        id: '1',
        firebase_uid: 'firebase123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      };

      (mockD1Database.prepare as Mock).mockReturnThis();
      (mockD1Database.bind as Mock).mockReturnThis();
      (mockD1Database.first as Mock).mockResolvedValue(mockUser);

      const result = await dbService.getUserByFirebaseUid('firebase123');

      expect(result).toEqual(mockUser);
      expect(mockD1Database.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE firebase_uid = ?')
      );
    });

    it('should update user last login', async () => {
      (mockD1Database.prepare as Mock).mockReturnThis();
      (mockD1Database.bind as Mock).mockReturnThis();
      (mockD1Database.run as Mock).mockResolvedValue({ success: true });

      await dbService.updateUserLastLogin('firebase123');

      expect(mockD1Database.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login_at = ? WHERE firebase_uid = ?')
      );
    });
  });

  describe('Strategy operations', () => {
    it('should create a strategy', async () => {
      const mockStrategy: StrategyEntity = {
        id: '1',
        user_id: 'user1',
        name: 'Test Strategy',
        description: 'A test strategy',
        config: '{}',
        is_public: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (mockD1Database.prepare as Mock).mockReturnThis();
      (mockD1Database.bind as Mock).mockReturnThis();
      (mockD1Database.first as Mock).mockResolvedValue(mockStrategy);

      const config = { etfSymbol: 'QQQ', initialCapital: 10000, triggers: [] };
      const result = await dbService.createStrategy('user1', 'Test Strategy', 'A test strategy', config);

      expect(result).toEqual(mockStrategy);
      expect(mockD1Database.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO strategies')
      );
    });

    it('should get strategy by ID and user ID', async () => {
      const mockStrategy: StrategyEntity = {
        id: '1',
        user_id: 'user1',
        name: 'Test Strategy',
        description: 'A test strategy',
        config: '{}',
        is_public: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (mockD1Database.prepare as Mock).mockReturnThis();
      (mockD1Database.bind as Mock).mockReturnThis();
      (mockD1Database.first as Mock).mockResolvedValue(mockStrategy);

      const result = await dbService.getStrategyById('1', 'user1');

      expect(result).toEqual(mockStrategy);
      expect(mockD1Database.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM strategies WHERE id = ? AND user_id = ?')
      );
    });
  });
});