import { ETFDataPoint } from '../../types';
import { PerformanceAnalyzer } from '../performance-analyzer';
import { BenchmarkStrategy, BenchmarkResult } from './interface';

export class AdaptiveTrendBenchmark3_3 implements BenchmarkStrategy {
	/**
	 * 计算基准3.3：自适应趋势跟随 (Adaptive Trend Following)
	 * 核心思想：均线多头排列进场，根据 VIX 波动率动态调整离场止损线。
	 *
	 * 规则：
	 * 1. 进场 (买入): 价格 > EMA(20) 且 EMA(20) > SMA(60)
	 * 2. 离场 (卖出):
	 *    - 如果 VIX < 20 (平稳期): 跌破 EMA(20) 离场 (止盈敏感)
	 *    - 如果 VIX >= 20 (动荡期): 跌破 SMA(60) 离场 (防洗盘，放宽止损)
	 */
	calculate(
		data: ETFDataPoint[],
		dates: string[],
		initialCapital: number,
		context?: any
	): BenchmarkResult {
		let cash = initialCapital;
		let positions = 0;
		const equityCurve: number[] = [];
		const datesSet = new Set(dates);

		// 交易统计
		let buyCount = 0;
		let sellCount = 0;
		let totalInvested = 0;
		let totalProceeds = 0;

		// 参数设置
		const fastPeriod = 20; // EMA 20
		const slowPeriod = 60; // SMA 60

		// 缓存用于计算均线
		let pricesForSMA: number[] = [];

		// EMA 计算需要上一次的 EMA 值
		let prevEMA: number | null = null;
		const k = 2 / (fastPeriod + 1); // EMA 权重系数

		// 获取 VIX
		const vixMap = context?.vixData as Map<string, number> | undefined;

		for (let i = 0; i < data.length; i++) {
			const point = data[i];
			const price = point.c;
			const date = point.d;

			// --- 1. 计算指标 ---

			// A. 计算 SMA(60)
			pricesForSMA.push(price);
			if (pricesForSMA.length > slowPeriod) {
				pricesForSMA.shift();
			}
			let sma60 = 0;
			if (pricesForSMA.length === slowPeriod) {
				sma60 = pricesForSMA.reduce((a, b) => a + b, 0) / slowPeriod;
			}

			// B. 计算 EMA(20)
			let ema20 = 0;
			if (prevEMA === null) {
				ema20 = price; // 初始化
			} else {
				ema20 = price * k + prevEMA * (1 - k);
			}
			prevEMA = ema20;

			// C. 获取 VIX
			const vix = vixMap?.get(date) || 0;

			// --- 2. 交易决策 ---

			// 只有当指标都准备好（即数据量足够）才开始交易
			if (i >= slowPeriod) {
				const isInvested = positions > 0;

				if (!isInvested) {
					// [买入信号]：多头排列
					// 价格站上短期线，且短期线在中期线之上（确认大趋势向上）
					if (price > ema20 && ema20 > sma60) {
						const quantity = cash / price;
						positions = quantity;
						totalInvested += cash;
						cash = 0;
						buyCount++;
					}
				} else {
					// [卖出信号]：自适应止损
					let sellSignal = false;

					if (vix < 20) {
						// 场景 A: 市场平稳/贪婪 -> 收紧止损，保护利润
						// 跌破短期均线即走人
						if (price < ema20) {
							sellSignal = true;
						}
					} else {
						// 场景 B: 市场恐慌/震荡 -> 放宽止损，防止被洗
						// 只有跌破长期生命线才认输
						if (price < sma60) {
							sellSignal = true;
						}
					}

					if (sellSignal) {
						const proceeds = positions * price;
						cash = proceeds;
						positions = 0;
						sellCount++;
						totalProceeds += proceeds;
					}
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
}