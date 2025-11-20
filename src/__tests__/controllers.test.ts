// src/__tests__/controllers.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { BacktestEngine } from '../lib/backtest-engine';
import { DatabaseService } from '../lib/database';
import { CacheService } from '../lib/cache';
import { backtestController } from '../controllers/backtest';
import { userController } from '../controllers/user';
import { strategyController } from '../controllers/strategy';

// Mock services
const mockBacktestEngine = {
  runBacktest: vi.fn(),
};

const mockDatabaseService = {
  getUserByFirebaseUid: vi.fn(),
  createUser: vi.fn(),
  updateUserLastLogin: vi.fn(),
  createStrategy: vi.fn(),
  getStrategiesByUserId: vi.fn(),
  getStrategyById: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
};

const mockCacheService = {
  getETFData: vi.fn(),
  setETFData: vi.fn(),
};

// Mock the services in the controller files
vi.mock('../lib/backtest-engine', () => ({
  BacktestEngine: vi.fn(() => mockBacktestEngine),
}));

vi.mock('../lib/database', () => ({
  DatabaseService: vi.fn(() => mockDatabaseService),
}));

vi.mock('../lib/cache', () => ({
  CacheService: vi.fn(() => mockCacheService),
}));

describe('Controllers', () => {
  describe('Backtest Controller', () => {
    it('should run backtest and return results', async () => {
      // Mock the backtest result
      const mockResult = {
        metadata: { symbol: 'QQQ', period: '2020-01-01 to 2024-12-31' },
        performance: {
          strategy: { totalReturn: 15.5, annualizedReturn: 10.2, maxDrawdown: -5.3, sharpeRatio: 1.2 },
          benchmark: { totalReturn: 12.1, annualizedReturn: 8.7, maxDrawdown: -8.1, sharpeRatio: 0.9 }
        },
        charts: {
          dates: ['2020-01-01', '2020-01-02'],
          strategyEquity: [10000, 10150],
          benchmarkEquity: [10000, 10120],
          underlyingPrice: [300, 302]
        }
      };

      mockBacktestEngine.runBacktest.mockResolvedValue(mockResult);

      // Create mock context
      const mockContext: any = {
        req: {
          json: vi.fn().mockResolvedValue({
            etfSymbol: 'QQQ',
            initialCapital: 10000,
            triggers: [],
          })
        },
        json: vi.fn(),
        env: {
          DB: {} as any,
          KV: {} as any,
        }
      };

      await backtestController.runBacktest(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return error on invalid input', async () => {
      // Mock invalid input that would fail validation
      const mockContext: any = {
        req: {
          json: vi.fn().mockResolvedValue({
            etfSymbol: '', // Invalid ETF symbol
            initialCapital: -1000, // Invalid capital
            triggers: [],
          })
        },
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await backtestController.runBacktest(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
      expect(mockContext.status).toHaveBeenCalledWith(400);
    });
  });

  describe('User Controller', () => {
    it('should sync user successfully', async () => {
      const mockUser = {
        id: '1',
        firebase_uid: 'firebase123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      };

      mockDatabaseService.getUserByFirebaseUid.mockResolvedValue(mockUser);

      const mockContext: any = {
        var: {
          firebaseUid: 'firebase123'
        },
        req: {
          json: vi.fn()
        },
        json: vi.fn(),
        env: {
          DB: {} as any,
        }
      };

      await userController.syncUser(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: 'firebase123'
        })
      );
    });
  });

  describe('Strategy Controller', () => {
    it('should create strategy successfully', async () => {
      const mockStrategy = {
        id: '1',
        user_id: 'user1',
        name: 'Test Strategy',
        description: 'A test strategy',
        config: '{}',
        is_public: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockDatabaseService.getUserByFirebaseUid.mockResolvedValue({ id: 'user1' } as any);
      mockDatabaseService.createStrategy.mockResolvedValue(mockStrategy);

      const mockContext: any = {
        var: {
          firebaseUid: 'firebase123'
        },
        req: {
          json: vi.fn().mockResolvedValue({
            name: 'Test Strategy',
            description: 'A test strategy',
            config: {}
          }),
        },
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
        env: {
          DB: {} as any,
        }
      };

      await strategyController.createStrategy(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          name: 'Test Strategy'
        })
      );
      expect(mockContext.status).toHaveBeenCalledWith(201);
    });
  });
});