import { ETFDataPoint } from '../../types';
import { PerformanceAnalyzer } from '../performance-analyzer';
import { BenchmarkStrategy, BenchmarkResult } from './interface';

export class WeeklyDCABenchmark implements BenchmarkStrategy {
	/**
	 * 计算基准2：增强型周定投 (Smart Weekly DCA)
	 *
	 * 基础逻辑：
	 * 将初始资金分成 N 份，每周第一个交易日买入。
	 *
	 * 增强逻辑 (马丁格尔变体)：
	 * - 连跌 2 周：投资 105%
	 * - 连跌 3 周：投资 110%
	 * - 连跌 N 周：投资 100% + (N-1)*5%
	 * - 其他情况：投资 100%
	 */
	calculate(
		data: ETFDataPoint[],
		dates: string[],
		initialCapital: number,
		context?: any
	): BenchmarkResult {
		// 过滤数据：只保留在 dates 范围内的数据点
		const filteredData = data.filter(d => dates.includes(d.d));

		if (filteredData.length === 0) {
			return this.createEmptyResult();
		}

		// 获取用户自定义的加速比率 (默认 0.12 即 12%)
		const accelerationRate = context?.dcaAcceleration !== undefined ? Number(context.dcaAcceleration) : 0.12;
		// 确保比率合理 (例如不小于0)
		const rate = Math.max(0, accelerationRate);

		// --- 阶段 1: 预计算每周的连跌状态 ---
		// 我们需要知道每一周开始时，之前已经连跌了多少周
		const weeklyStreaks = this.preCalculateWeeklyStreaks(filteredData);
		const totalWeeks = weeklyStreaks.size;

		if (totalWeeks === 0) {
			return this.createEmptyResult();
		}

		// --- 阶段 2: 计算基础周定投额 ---
		// 依然基于“完美分配”原则计算基数
		const baseWeeklyAmount = initialCapital / totalWeeks;

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

				// 1. 获取当前的基础连跌周数
				// 注意：weeklyStreaks 存储的是“这一周开始时，过去累计的连跌数”
				const streak = weeklyStreaks.get(currentWeekId) || 0;

				// 2. 计算加码系数 (指数加速)
				// 连跌2周 -> (1+rate)
				// 连跌3周 -> (1+rate)^2
				// 连跌N周 -> (1+rate)^(N-1)
				let multiplier = 1.0;
				if (streak >= 2) {
					multiplier = Math.pow(1 + rate, streak - 1);
				}

				// 3. 计算实际投资额
				let investAmount = baseWeeklyAmount * multiplier;

				// 4. 资金检查 (兜底逻辑)
				// 如果现金不够加码了，就用光所有现金
				if (cash < investAmount) {
					investAmount = cash;
				}

				// 执行交易
				const quantity = investAmount / currentPrice;
				positions += quantity;
				cash -= investAmount;
				buyCount++;
				totalInvested += investAmount;

				if (cash < EPSILON) cash = 0;
				lastWeekId = currentWeekId;
			}

			// 计算净值
			const totalValue = cash + (positions * currentPrice);
			equityCurve.push(totalValue);
		}

		return {
			equityCurve,
			stats: {
				...PerformanceAnalyzer.calculateMetricsFromCurve(equityCurve, dates, {
					totalTrades: buyCount,
					buyCount: buyCount,
					sellCount: 0,
					totalInvested: totalInvested,
					totalProceeds: 0
				}, initialCapital),
				dcaAccelerationRate: rate // Add the acceleration rate to stats
			}
		};
	}

	/**
	 * 预计算每周的“之前的连跌周数”
	 * 返回 Map: WeekID -> 过去连跌了多少周
	 */
	private preCalculateWeeklyStreaks(data: ETFDataPoint[]): Map<string, number> {
		const streaksMap = new Map<string, number>(); // Key: WeekID, Value: Streak
		const weeklyCloses: { weekId: string, close: number }[] = [];

		// 1. 提取每周的收盘价
		// 因为 data 是按时间排序的，我们可以遍历一遍，不断更新同一周的 close，最后留下的就是周五收盘价
		let currentWeekId = '';
		let currentWeekClose = 0;

		for (const point of data) {
			const weekId = this.getWeekIdentifier(point.d);
			if (weekId !== currentWeekId) {
				if (currentWeekId !== '') {
					weeklyCloses.push({ weekId: currentWeekId, close: currentWeekClose });
				}
				currentWeekId = weekId;
			}
			currentWeekClose = point.c;
		}
		// 推入最后一周
		if (currentWeekId !== '') {
			weeklyCloses.push({ weekId: currentWeekId, close: currentWeekClose });
		}

		// 2. 计算连跌
		// 我们需要计算的是：在 Week[i] 开始时，过去连跌了多少周
		let currentStreak = 0;

		// 第一周之前肯定没跌，streak = 0
		if (weeklyCloses.length > 0) {
			streaksMap.set(weeklyCloses[0].weekId, 0);
		}

		for (let i = 1; i < weeklyCloses.length; i++) {
			const prevWeekPrice = weeklyCloses[i - 1].close;
			// 获取再上一周的价格来比较上一周是涨是跌
			// 注意：判断“连跌”需要比较 (Week i-1) vs (Week i-2)

			if (i >= 2) {
				const prevPrevWeekPrice = weeklyCloses[i - 2].close;
				if (prevWeekPrice < prevPrevWeekPrice) {
					currentStreak++;
				} else {
					currentStreak = 0;
				}
			} else {
				// 第2周开始时，只过去了1周，不可能连跌2周，streak最多是1或者0
				// 简单起见，初始阶段 streak 设为 0
				currentStreak = 0;
			}

			// 将计算好的 streak 存给“当前周”
			// 意味着：当我们在 weeklyCloses[i].weekId 这一周准备买入时，streak 是多少
			streaksMap.set(weeklyCloses[i].weekId, currentStreak);
		}

		return streaksMap;
	}

	private getWeekIdentifier(dateStr: string): string {
		const date = new Date(dateStr);
		date.setHours(0, 0, 0, 0);
		date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		const week1 = new Date(date.getFullYear(), 0, 4);
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
				tradeStats: { totalTrades: 0, buyCount: 0, sellCount: 0, totalInvested: 0, totalProceeds: 0 }
			}
		};
	}
}
