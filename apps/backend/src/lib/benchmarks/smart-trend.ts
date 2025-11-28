import { ETFDataPoint } from '../../types';
import { PerformanceAnalyzer } from '../performance-analyzer';
import { BenchmarkStrategy, BenchmarkResult } from './interface';

export class SmartTrendBenchmark implements BenchmarkStrategy {
    /**
     * 计算基准3（新）：智能趋势评分 (Smart Trend Score)
     * 逻辑：
     * 1. 计算价格序列的线性回归斜率 (Linear Regression Slope)。
     * 2. 斜率 > 0 -> 上升趋势 -> 买入/持有。
     * 3. 斜率 < 0 -> 下降趋势 -> 卖出/空仓。
     * 4. 全仓切换 (All-in / All-out)。
     */
    calculate(
        data: ETFDataPoint[],
        dates: string[],
        initialCapital: number,
        _context?: any
    ): BenchmarkResult {
        let cash = initialCapital;
        let positions = 0;
        const equityCurve: number[] = [];
        
        // 优化查找性能
        const datesSet = new Set(dates);
        
        // 交易统计
        let buyCount = 0;
        let sellCount = 0;
        let totalInvested = 0;
        let totalProceeds = 0;

        // 线性回归周期 (e.g. 20日)
        const period = 20;

        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            const price = point.c;
            const date = point.d;

            // --- 1. 计算指标 (线性回归斜率) ---
            let slope = 0;
            if (i >= period - 1) {
                // 获取过去 N 天的收盘价 (包括今天)
                const prices = data.slice(i - period + 1, i + 1).map(d => d.c);
                slope = SmartTrendBenchmark.calculateLinearRegressionSlope(prices);
            }

            // --- 2. 执行交易决策 ---
            const isInvested = positions > 0;

            if (!isInvested) {
                // 买入信号：趋势向上
                if (slope > 0) {
                    const quantity = cash / price;
                    positions = quantity;
                    totalInvested += cash;
                    cash = 0;
                    buyCount++;
                }
            } else {
                // 卖出信号：趋势向下
                if (slope < 0) {
                    const proceeds = positions * price;
                    cash = proceeds;
                    positions = 0;
                    sellCount++;
                    totalProceeds += proceeds;
                }
            }

            // --- 3. 记录净值 ---
            const totalValue = cash + (positions * price);
            
            if (datesSet.has(date)) {
                equityCurve.push(totalValue);
            }
        }

        return {
            equityCurve,
            stats: PerformanceAnalyzer.calculateMetricsFromCurve(equityCurve, dates, {
                totalTrades: buyCount + sellCount,
                buyCount,
                sellCount,
                totalInvested,
                totalProceeds
            }, initialCapital)
        };
    }

    /**
     * 辅助函数：计算线性回归斜率
     * 算法复杂度: O(N), N=period (很小, e.g. 20)
     */
    private static calculateLinearRegressionSlope(prices: number[]): number {
        const n = prices.length;
        if (n < 2) return 0;

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        // X轴是时间索引 (0, 1, 2...), Y轴是价格
        for (let i = 0; i < n; i++) {
            const x = i;
            const y = prices[i];
            
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }

        // 线性回归斜率公式: m = (N*ΣXY - ΣX*ΣY) / (N*ΣXX - (ΣX)^2)
        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return 0;

        const slope = (n * sumXY - sumX * sumY) / denominator;
        
        return slope;
    }
}
