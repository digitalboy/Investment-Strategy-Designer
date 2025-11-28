import { ETFDataPoint, PerformanceMetrics } from '../../types';
import { PerformanceAnalyzer } from '../performance-analyzer';
import { BenchmarkStrategy, BenchmarkResult } from './interface';

export class MultiFactorBenchmark implements BenchmarkStrategy {
    /**
     * 计算基准3 (旧)：多因子评分模型 (Multi-Factor Scoring Model)
     * 一个基于 VIX、RSI 和 回撤 的择时策略
     * 规则：
     * - VIX > 20 (+1), VIX > 30 (+1)
     * - RSI < 40 (+1), RSI < 30 (+1)
     * - DD < -5% (+1), DD < -15% (+1)
     * - Score >= 2 -> 买入/持有
     * - RSI > 70 or DD > -2% -> 卖出/空仓
     */
    calculate(
        data: ETFDataPoint[],
        dates: string[],
        initialCapital: number,
        context?: any
    ): BenchmarkResult {
        const vixMap = context?.vixMap || context; // Support passing Map directly or wrapped in object

        let cash = initialCapital;
        let positions = 0;
        const equityCurve: number[] = [];
        let runningMax = -Infinity;

        // 优化查找性能
        const datesSet = new Set(dates);

        // 交易统计
        let buyCount = 0;
        let sellCount = 0;
        let totalInvested = 0;
        let totalProceeds = 0;

        // 简单的 RSI 计算状态
        const rsiPeriod = 14;
        let gains: number[] = [];
        let losses: number[] = [];

        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            const price = point.c;
            const date = point.d;

            // --- 1. 更新指标数据 ---

            // A. 更新回撤
            if (price > runningMax) runningMax = price;
            const drawdown = ((price - runningMax) / runningMax) * 100;

            // B. 更新 RSI (简单版 SMA 算法)
            let rsi = 50; // 默认中性
            if (i > 0) {
                const change = price - data[i - 1].c;
                gains.push(change > 0 ? change : 0);
                losses.push(change < 0 ? Math.abs(change) : 0);

                // 保持窗口大小
                if (gains.length > rsiPeriod) {
                    gains.shift();
                    losses.shift();
                }

                if (i >= rsiPeriod) {
                    const avgGain = gains.reduce((a, b) => a + b, 0) / rsiPeriod;
                    const avgLoss = losses.reduce((a, b) => a + b, 0) / rsiPeriod;
                    if (avgLoss === 0) rsi = 100;
                    else rsi = 100 - (100 / (1 + avgGain / avgLoss));
                }
            }

            // C. 获取 VIX
            const vix = vixMap?.get(date) || 0;

            // --- 2. 计算多因子分数 (Multi-Factor Score) ---
            let score = 0;

            // 因子1: 恐慌指数
            if (vix > 20) score += 1;
            if (vix > 30) score += 1; // 叠加

            // 因子2: RSI 超卖
            if (rsi < 40) score += 1;
            if (rsi < 30) score += 1; // 叠加

            // 因子3: 回撤深度
            if (drawdown < -5) score += 1;
            if (drawdown < -15) score += 1; // 叠加

            // --- 3. 执行交易决策 ---

            const isInvested = positions > 0;

            if (!isInvested) {
                // 买入信号: 分数 >= 2 (只要有两个维度的轻度信号，或一个维度的重度信号)
                if (score >= 2) {
                    const quantity = cash / price;
                    positions = quantity;
                    totalInvested += cash;
                    cash = 0;
                    buyCount++;
                }
            } else {
                // 卖出信号:
                // 1. RSI 超买 (>70) -> 即使没创新高也卖
                // 2. 价格修复 (回撤 > -2%) -> 接近前高，获利了结
                // 3. 保护性止损 (可选，暂不加，保持基准简单)
                if (rsi > 70 || drawdown > -2) {
                    const proceeds = positions * price;
                    cash = proceeds;
                    positions = 0;
                    sellCount++;
                    totalProceeds += proceeds;
                }
            }

            // --- 4. 记录净值 ---
            const totalValue = cash + (positions * price);

            // 只有在 dates 列表中的日期才记录到 equityCurve (保持对齐)
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
}
