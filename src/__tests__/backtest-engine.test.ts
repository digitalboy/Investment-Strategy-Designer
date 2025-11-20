// src/__tests__/backtest-engine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BacktestEngine } from '../lib/backtest-engine';
import { StrategyConfig, ETFData } from '../types';

describe('BacktestEngine', () => {
  let backtestEngine: BacktestEngine;
  let mockETFData: ETFData;

  beforeEach(() => {
    backtestEngine = new BacktestEngine();
    
    // 创建模拟ETF数据
    mockETFData = {
      symbol: 'QQQ',
      lastUpdated: new Date().toISOString(),
      data: [
        { d: '2023-01-01', o: 300, h: 305, l: 295, c: 303, v: 1000000 },
        { d: '2023-01-02', o: 303, h: 308, l: 300, c: 306, v: 1200000 },
        { d: '2023-01-03', o: 306, h: 310, l: 302, c: 298, v: 1100000 },
        { d: '2023-01-04', o: 298, h: 302, l: 295, c: 300, v: 900000 },
        { d: '2023-01-05', o: 300, h: 305, l: 297, c: 304, v: 1000000 },
      ]
    };
  });

  it('should run a basic backtest with no triggers', async () => {
    const strategy: StrategyConfig = {
      etfSymbol: 'QQQ',
      initialCapital: 10000,
      triggers: []
    };

    const result = await backtestEngine.runBacktest(strategy, mockETFData);

    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('performance');
    expect(result).toHaveProperty('charts');
    expect(result.metadata.symbol).toBe('QQQ');
    expect(result.performance.strategy).toBeDefined();
    expect(result.performance.benchmark).toBeDefined();
  });

  it('should handle buy trigger correctly', async () => {
    const strategy: StrategyConfig = {
      etfSymbol: 'QQQ',
      initialCapital: 10000,
      triggers: [
        {
          condition: {
            type: 'drawdownFromPeak',
            params: { days: 5, percentage: 2 }
          },
          action: {
            type: 'buy',
            value: {
              type: 'fixedAmount',
              amount: 1000
            }
          }
        }
      ]
    };

    const result = await backtestEngine.runBacktest(strategy, mockETFData);

    expect(result).toBeDefined();
    expect(result.performance.strategy.totalReturn).toBeDefined();
  });

  it('should calculate performance metrics correctly', () => {
    const values = [100, 110, 90, 95, 120];
    const maxDrawdown = (backtestEngine as any).calculateMaxDrawdown(values);
    
    // The max drawdown should be calculated correctly
    expect(maxDrawdown).toBeLessThan(0); // Drawdown is negative
  });

  it('should prepare chart data correctly', () => {
    const accountHistory: { [date: string]: any } = {
      '2023-01-01': { totalValue: 10000 },
      '2023-01-02': { totalValue: 10100 },
      '2023-01-03': { totalValue: 9900 },
    };

    const chartData = (backtestEngine as any).prepareChartData(mockETFData.data, accountHistory);

    expect(chartData.dates).toEqual(['2023-01-01', '2023-01-02', '2023-01-03']);
    expect(chartData.strategyEquity).toEqual([10000, 10100, 9900]);
    expect(chartData.benchmarkEquity).toBeDefined();
    expect(chartData.underlyingPrice).toBeDefined();
  });
});