// src/controllers/backtest.ts
import { Context } from 'hono';
import { z } from 'zod';
import { DatabaseService } from '../lib/database';
import { CacheService } from '../lib/cache';
import { BacktestEngine } from '../lib/backtest-engine';
import { StrategyConfig, BacktestResultDTO, ETFData } from '../types';

// Backtest request schema
const backtestRequestSchema = z.object({
  etfSymbol: z.string().min(1).max(10),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  initialCapital: z.number().positive(),
  triggers: z.array(z.any()) // We'll validate trigger structure in the implementation
});

interface Env {
  DB: D1Database;
  ETF_STRATEGY_DATA: KVNamespace;
  FIREBASE_PROJECT_ID: string;
}

export const backtestController = {
  runBacktest: async (c: Context<{ Bindings: Env }>) => {
    try {
      const { etfSymbol, startDate, endDate, initialCapital, triggers } = await c.req.json();

      // Validate inputs
      try {
        backtestRequestSchema.parse({ etfSymbol, startDate, endDate, initialCapital, triggers });
      } catch (validationError: any) {
        return c.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input parameters',
            details: validationError.errors
          }
        }, 400);
      }

      // Initialize services
      const _dbService = new DatabaseService(c.env.DB);  // Prefix with _ to indicate unused
      const cacheService = new CacheService(c.env.ETF_STRATEGY_DATA);
      const backtestEngine = new BacktestEngine();

      // Get ETF data from cache or fetch from external API
      let etfData = await cacheService.getETFData(etfSymbol);

      if (!etfData) {
        // In a real implementation, we would fetch data from Yahoo Finance API
        // For this example, we'll create mock data
        console.log(`ETF data not found in cache for ${etfSymbol}`, `would fetch from external API in real implementation`);

        // Mock implementation - in real app, fetch from Yahoo Finance
        etfData = generateMockETFData(etfSymbol, startDate || '2020-01-01', endDate || '2024-12-31');

        // Cache the mock data
        await cacheService.setETFData(etfSymbol, etfData);
      }

      // Create strategy config
      const strategyConfig: StrategyConfig = {
        etfSymbol,
        startDate,
        endDate,
        initialCapital,
        triggers
      };

      // Run the backtest - check for null before passing to backtest engine
      if (!etfData) {
        return c.json({
          error: {
            code: 'DATA_ERROR',
            message: 'ETF data is required for backtesting'
          }
        }, 500);
      }

      const result: BacktestResultDTO = await backtestEngine.runBacktest(strategyConfig, etfData);

      return c.json(result);
    } catch (error) {
      console.error('Backtest error:', error);
      return c.json({
        error: {
          code: 'BACKTEST_ERROR',
          message: 'An error occurred while running the backtest'
        }
      }, 500);
    }
  }
};

// This is a mock function to generate ETF data for demonstration
// In the real implementation, this would fetch from Yahoo Finance API
function generateMockETFData(symbol: string, startDate: string, endDate: string): ETFData {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data = [];

  // Generate mock data points
  let currentDate = new Date(start);
  let currentValue = 300 + Math.random() * 100; // Starting value between 300-400

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Generate random price movement
    const changePercent = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%
    const newValue = currentValue * (1 + changePercent);

    // Generate OHLC values
    const open = currentValue;
    const close = newValue;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02); // Add up to 2% high
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);  // Subtract up to 2% low
    const volume = Math.floor(1000000 + Math.random() * 9000000); // Volume between 1M-10M

    data.push({
      d: dateStr,
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(close.toFixed(2)),
      v: volume
    });

    currentValue = newValue;
    currentDate.setDate(currentDate.getDate() + 1);

    // Skip weekends
    if (currentDate.getDay() === 0) { // Sunday
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (currentDate.getDay() === 6) { // Saturday
      currentDate.setDate(currentDate.getDate() + 2);
    }
  }

  return {
    symbol,
    lastUpdated: new Date().toISOString(),
    data
  };
}
