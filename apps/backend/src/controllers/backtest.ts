// src/controllers/backtest.ts
import { Context } from 'hono';
import { z } from 'zod';
import { DatabaseService } from '../lib/database';
import { CacheService } from '../lib/cache';
import { BacktestEngine, MarketContext } from '../lib/backtest-engine';
import { StrategyConfig, BacktestResultDTO } from '../types';

// Backtest request schema
const backtestRequestSchema = z.object({
	etfSymbol: z.string().min(1).max(10),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	initialCapital: z.number().positive(),
	triggers: z.array(z.any()) // We'll validate trigger structure in the implementation
});

interface Env {
	etf_strategy_db: D1Database;
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
			const _dbService = new DatabaseService(c.env.etf_strategy_db);  // Prefix with _ to indicate unused
			const cacheService = new CacheService(c.env.ETF_STRATEGY_DATA);
			const backtestEngine = new BacktestEngine();

			// Prepare data fetch promises - always fetch VIX data as an important market sentiment reference
			const etfPromise = cacheService.getETFData({
				symbol: etfSymbol,
				startDate,
				endDate,
				ctx: c.executionCtx,
			});

			const vixPromise = cacheService.getETFData({
				symbol: '^VIX',
				startDate,
				endDate,
				ctx: c.executionCtx,
			});

			// Wait for all data
			const [etfData, vixDataRaw] = await Promise.all([etfPromise, vixPromise]);

			// Create strategy config
			const strategyConfig: StrategyConfig = {
				etfSymbol,
				startDate,
				endDate,
				initialCapital,
				triggers
			};

			// Run the backtest - check for null before passing to backtest engine
			if (!etfData || etfData.data.length === 0) {
				return c.json({
					error: {
						code: 'DATA_ERROR',
						message: 'ETF data is required for backtesting'
					}
				}, 500);
			}

			// Build Market Context
			const context: MarketContext = {};
			if (vixDataRaw && vixDataRaw.data) {
				context.vixData = new Map(vixDataRaw.data.map(point => [point.d, point.c]));
			}

			const result: BacktestResultDTO = await backtestEngine.runBacktest(strategyConfig, etfData, context);

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
