import { ETFDataPoint, PerformanceMetrics } from '../../types';
import { PerformanceAnalyzer } from '../performance-analyzer';
import { BenchmarkStrategy, BenchmarkResult } from './interface';

export class WeeklyDCABenchmark implements BenchmarkStrategy {
    /**
     * 计算基准2：周定投 (Weekly DCA)
     * 逻辑：将初始资金分成 N 份（N=周数），每周第一个交易日定额买入。
     * 注意：这里的“初始资金”是指用于对比的总预算。
     */
    calculate(
        data: ETFDataPoint[],
        dates: string[],
        initialCapital: number,
        _context?: any
    ): BenchmarkResult {
        // 过滤数据：只保留在 dates 范围内的数据点
        const filteredData = data.filter(d => dates.includes(d.d));

        if (filteredData.length === 0) {
            return this.createEmptyResult();
        }

        // --- 阶段 1: 预扫描总周数 ---
        const weeksSet = new Set<string>();
        filteredData.forEach(d => weeksSet.add(this.getWeekIdentifier(d.d)));
        const totalWeeks = weeksSet.size;

        if (totalWeeks === 0) {
            return this.createEmptyResult();
        }

        // --- 阶段 2: 计算每周应投金额 ---
        const weeklyAmount = initialCapital / totalWeeks;

        // --- 阶段 3: 模拟交易 ---
        let cash = initialCapital;
        let positions = 0;
        let lastWeekId = '';
        const equityCurve: number[] = [];
        let buyCount = 0;
        let totalInvested = 0;

        const EPSILON = 0.0001;

        for (const point of filteredData) {
            const currentWeekId = this.getWeekIdentifier(point.d);
            const currentPrice = point.c;

            // 如果进入新的一周，且还有现金，则买入
            if (currentWeekId !== lastWeekId && cash > EPSILON) {
                let investAmount = weeklyAmount;
                // 确保不超支
                if (cash < weeklyAmount + EPSILON) {
                    investAmount = cash;
                }

                const quantity = investAmount / currentPrice;
                positions += quantity;
                cash -= investAmount;
                buyCount++;
                totalInvested += investAmount;

                if (cash < EPSILON) cash = 0;
                lastWeekId = currentWeekId;
            }

            const totalValue = cash + (positions * currentPrice);
            equityCurve.push(totalValue);
        }

        return {
            equityCurve,
            stats: PerformanceAnalyzer.calculateMetricsFromCurve(equityCurve, dates, {
                totalTrades: buyCount,
                buyCount: buyCount,
                sellCount: 0,
                totalInvested: totalInvested,
                totalProceeds: 0
            }, initialCapital)
        };
    }

    private getWeekIdentifier(dateStr: string): string {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        // 设置为当周的周四 (ISO 8601 week number)
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        // 计算周数
        const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    }

    private createEmptyResult(): BenchmarkResult {
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
