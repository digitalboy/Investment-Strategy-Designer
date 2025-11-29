import { ETFDataPoint } from '../../types';
import { PerformanceAnalyzer } from '../performance-analyzer';
import { BenchmarkStrategy, BenchmarkResult } from './interface';

export class SmartTrendBenchmark3_2 implements BenchmarkStrategy {
	/**
	 * 计算基准3.2：智能趋势评分 (Smart Trend Score)
	 * 核心思想：趋势为主，情绪为辅。
	 *
	 * 计分板：
	 * 1. 主趋势 (权重最高): 斜率 > 0 (+2), 斜率 < 0 (-2)
	 * 2. 情绪修正 (VIX): > 30 (+2, 恐慌抄底), < 12 (-1, 贪婪减仓)
	 * 3. 动能修正 (RSI): < 30 (+2, 超卖反弹), > 75 (-1, 超买回调)
	 *
	 * 决策逻辑:
	 * - 总分 > 0: 全仓持有
	 * - 总分 <= 0: 空仓观望
	 */
	calculate(
		data: ETFDataPoint[],
		dates: string[],
		initialCapital: number,
		context?: any // 接收 context.vixData
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

		// 指标计算缓存窗口
		const slopePeriod = 20;
		const rsiPeriod = 14;

		// 缓存数组
		let priceWindow: number[] = []; // 用于计算斜率
		let rsiGains: number[] = [];    // 用于计算 RSI Gain
		let rsiLosses: number[] = [];   // 用于计算 RSI Loss

		// 获取 VIX 数据 (需要后端 DataProvider 支持并在 context 中传入)
		const vixMap = context?.vixData as Map<string, number> | undefined;

		for (let i = 0; i < data.length; i++) {
			const point = data[i];
			const price = point.c;
			const date = point.d;

			// --- 1. 计算指标 ---

			// A. 斜率 (Slope 20日)
			priceWindow.push(price);
			if (priceWindow.length > slopePeriod) {
				priceWindow.shift();
			}

			let slope = 0;
			// 只有数据量足够时才计算有效斜率
			if (priceWindow.length === slopePeriod) {
				slope = SmartTrendBenchmark3_2.calculateLinearRegressionSlope(priceWindow);
			}

			// B. RSI (14日, 简单 SMA 算法)
			let rsi = 50; // 默认中性
			if (i > 0) {
				const change = price - data[i - 1].c;
				rsiGains.push(change > 0 ? change : 0);
				rsiLosses.push(change < 0 ? Math.abs(change) : 0);

				if (rsiGains.length > rsiPeriod) {
					rsiGains.shift();
					rsiLosses.shift();
				}

				if (i >= rsiPeriod) {
					const avgGain = rsiGains.reduce((a, b) => a + b, 0) / rsiPeriod;
					const avgLoss = rsiLosses.reduce((a, b) => a + b, 0) / rsiPeriod;

					if (avgLoss === 0) rsi = 100;
					else rsi = 100 - (100 / (1 + avgGain / avgLoss));
				}
			}

			// C. VIX
			// 如果当天没有 VIX 数据 (如节假日差异)，默认为 0 (不影响得分)
			const vix = vixMap?.get(date) || 0;

			// --- 2. 综合打分 (Scoring) ---
			let score = 0;

			// 因子 1: 主趋势 (Trend) - 决定大方向
			if (slope > 0) score += 2;      // 上升趋势
			else if (slope < 0) score -= 2; // 下降趋势

			// 因子 2: 情绪修正 (Fear/Greed) - VIX
			if (vix > 30) score += 2;       // 极度恐慌，可能见底 (黄金坑)
			else if (vix > 0 && vix < 12) score -= 1; // 极度贪婪，风险积聚

			// 因子 3: 动能修正 (Momentum) - RSI
			if (rsi < 30) score += 2;       // 超卖，反弹在即
			else if (rsi > 75) score -= 1;  // 超买，警惕回调

			// --- 3. 执行交易决策 ---
			const isInvested = positions > 0;

			if (!isInvested) {
				// 买入信号: 总分 > 0
				// 场景解读：
				// 1. 顺势: 斜率向上(+2) + 无极端坏消息 = >0 -> 买入
				// 2. 抄底: 斜率向下(-2) + 恐慌(+2) + 超卖(+2) = +2 -> 买入
				if (score > 0) {
					const quantity = cash / price;
					positions = quantity;
					totalInvested += cash;
					cash = 0;
					buyCount++;
				}
			} else {
				// 卖出信号: 总分 <= 0
				// 场景解读：
				// 1. 破位: 斜率向下(-2) + 无抄底理由 = -2 -> 卖出
				// 2. 见顶: 斜率向上(+2) + 极度贪婪(-1) + 超买(-1) = 0 -> 卖出
				if (score <= 0) {
					const proceeds = positions * price;
					cash = proceeds;
					positions = 0;
					sellCount++;
					totalProceeds += proceeds;
				}
			}

			// --- 4. 记录净值 ---
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
	 * 算法复杂度: O(N), N=period (20)
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
