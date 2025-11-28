import { ETFDataPoint, PerformanceMetrics } from '../../types';
import { PerformanceAnalyzer } from '../performance-analyzer';
import { BenchmarkStrategy, BenchmarkResult } from './interface';

export class BuyAndHoldBenchmark implements BenchmarkStrategy {
    /**
     * 计算基准1：买入并持有 (Buy and Hold)
     * 逻辑：期初使用所有资金全仓买入，持有至期末。
     */
    calculate(
        data: ETFDataPoint[],
        dates: string[],
        initialCapital: number,
        _context?: any
    ): BenchmarkResult {
        if (data.length === 0 || dates.length === 0) {
            return this.createEmptyResult(initialCapital);
        }

        // 1. 模拟交易
        const initialPrice = data[0].c;
        const shares = initialCapital / initialPrice; // 允许碎股
        
        // 2. 生成净值曲线 (仅针对 dates 中的日期)
        // 为了性能，先构建 data map
        const dataMap = new Map<string, number>();
        data.forEach(p => dataMap.set(p.d, p.c));

        const equityCurve: number[] = [];
        dates.forEach(date => {
            const price = dataMap.get(date);
            if (price !== undefined) {
                equityCurve.push(price * shares);
            } else {
                // 如果某天没有数据，沿用上一个值 (或初始值)
                const lastValue = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1] : initialCapital;
                equityCurve.push(lastValue);
            }
        });

        // 3. 统计指标
        // 买入并持有只有一笔交易
        const tradeStats = {
            totalTrades: 1,
            buyCount: 1,
            sellCount: 0,
            totalInvested: initialCapital,
            totalProceeds: 0 // 未卖出
        };

        return {
            equityCurve,
            stats: PerformanceAnalyzer.calculateMetricsFromCurve(equityCurve, dates, tradeStats, initialCapital)
        };
    }

    private createEmptyResult(initialCapital: number): BenchmarkResult {
        return {
            equityCurve: [],
            stats: {
                totalReturn: 0,
                annualizedReturn: 0,
                maxDrawdown: 0,
                sharpeRatio: 0,
                tradeStats: {
                    totalTrades: 0,
                    buyCount: 0,
                    sellCount: 0,
                    totalInvested: 0,
                    totalProceeds: 0
                }
            }
        };
    }
}
