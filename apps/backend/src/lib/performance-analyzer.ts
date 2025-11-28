// src/lib/performance-analyzer.ts
import { ETFDataPoint, AccountState, Trade, PerformanceMetrics, TradeStats } from '../types';

export class PerformanceAnalyzer {
	static calculateMaxDrawdown(values: number[]): number {
		if (values.length === 0) return 0;

		let maxDrawdown = 0;
		let peak = values[0];

		for (let i = 1; i < values.length; i++) {
			if (values[i] > peak) {
				peak = values[i];
			}

			const drawdown = ((peak - values[i]) / peak) * 100;
			if (drawdown > maxDrawdown) {
				maxDrawdown = drawdown;
			}
		}

		return -maxDrawdown; // 返回负值表示损失
	}

	static calculateSharpeRatio(values: number[]): number {
		if (values.length < 2) return 0;

		// 计算日收益率
		const returns: number[] = [];
		for (let i = 1; i < values.length; i++) {
			returns.push((values[i] - values[i - 1]) / values[i - 1]);
		}

		// 计算平均收益率
		const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

		// 计算收益率的标准差
		const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
		const stdDev = Math.sqrt(variance);

		if (stdDev === 0) return 0;

		// 夏普比率 = (平均收益率 - 无风险利率) / 收益率标准差
		// 这里假设无风险利率为0
		return (avgReturn / stdDev) * Math.sqrt(252); // 年化
	}

	/**
	 * 计算基准2：周定投 (Weekly DCA)
	 */
	static calculateWeeklyDCABenchmark(
		data: ETFDataPoint[],
		dates: string[], // 用于对齐图表的全量日期
		initialCapital: number
	): { equityCurve: number[], stats: PerformanceMetrics } {
		// 默认空统计
		const emptyStats: PerformanceMetrics = {
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
		};

		// 过滤数据：只保留在 dates 范围内的数据点
		const filteredData = data.filter(d => dates.includes(d.d));

		if (filteredData.length === 0) {
			return { equityCurve: [], stats: emptyStats };
		}

		// --- 阶段 1: 预扫描总周数 ---
		const weeksSet = new Set<string>();
		filteredData.forEach(d => weeksSet.add(this.getWeekIdentifier(d.d)));
		const totalWeeks = weeksSet.size;

		// 防御性编程：如果数据为空或不足一周
		if (totalWeeks === 0) {
			return { equityCurve: [], stats: emptyStats };
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

			if (currentWeekId !== lastWeekId && cash > EPSILON) {
				let investAmount = weeklyAmount;
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

		// --- 阶段 4: 计算性能指标 ---
		if (equityCurve.length === 0) {
			return { equityCurve: [], stats: emptyStats };
		}

		const startValue = initialCapital;
		const endValue = equityCurve[equityCurve.length - 1];

		const totalReturn = ((endValue - startValue) / startValue) * 100;

		const startDate = new Date(dates[0]);
		const endDate = new Date(dates[dates.length - 1]);
		const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
		const annualizedReturn = years > 0 ? (Math.pow(endValue / startValue, 1 / years) - 1) * 100 : 0;

		const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
		const sharpeRatio = this.calculateSharpeRatio(equityCurve);

		const stats: PerformanceMetrics = {
			totalReturn,
			annualizedReturn,
			maxDrawdown,
			sharpeRatio,
			tradeStats: {
				totalTrades: buyCount,
				buyCount: buyCount,
				sellCount: 0,
				totalInvested: totalInvested,
				totalProceeds: 0
			}
		};

		return { equityCurve, stats };
	}



	static calculateMetricsFromCurve(
		equityCurve: number[], 
		dates: string[], 
		tradeStats: TradeStats,
		initialCapital: number
	): PerformanceMetrics {
		if (equityCurve.length === 0) {
			return {
				totalReturn: 0,
				annualizedReturn: 0,
				maxDrawdown: 0,
				sharpeRatio: 0,
				tradeStats
			};
		}

		const startValue = initialCapital; // 或者 equityCurve[0] ? 但基准应该从初始资金算起
		const endValue = equityCurve[equityCurve.length - 1];

		const totalReturn = ((endValue - startValue) / startValue) * 100;

		const startDate = new Date(dates[0]);
		const endDate = new Date(dates[dates.length - 1]);
		const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
		const annualizedReturn = years > 0 ? (Math.pow(endValue / startValue, 1 / years) - 1) * 100 : 0;

		const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
		const sharpeRatio = this.calculateSharpeRatio(equityCurve);

		return {
			totalReturn,
			annualizedReturn,
			maxDrawdown,
			sharpeRatio,
			tradeStats
		};
	}

	private static getWeekIdentifier(dateStr: string): string {
		const date = new Date(dateStr);
		date.setHours(0, 0, 0, 0);
		date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		const week1 = new Date(date.getFullYear(), 0, 4);
		const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
		return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
	}

	/**
	 * 计算历史前 N 大回撤事件
	 * @param equityCurve 策略净值曲线 (日期和对应价值)
	 * @param topN 返回前几名 (默认 5)
	 */
	static calculateTopDrawdowns(equityCurve: { date: string; value: number }[], topN: number = 5): import('../types').DrawdownEvent[] {
		const events: import('../types').DrawdownEvent[] = [];

		let runningMax = -Infinity;
		let peakDate = '';

		// 临时存储当前正在发生的回撤
		let currentEvent: Partial<import('../types').DrawdownEvent> | null = null;

		for (const point of equityCurve) {
			const price = point.value;
			const date = point.date;

			if (price >= runningMax) {
				// --- 场景 A: 创新高 (或者持平) ---

				// 1. 如果之前有正在进行的回撤，说明今天“回本”了
				if (currentEvent) {
					currentEvent.recoveryDate = date;
					currentEvent.isRecovered = true;
					// 计算恢复天数 (交易日)
					// 找到峰值日期的索引和恢复日期的索引
					const peakIdx = equityCurve.findIndex(p => p.date === currentEvent!.peakDate);
					const recoveryIdx = equityCurve.findIndex(p => p.date === date);
					if (peakIdx !== -1 && recoveryIdx !== -1) {
						currentEvent.daysToRecover = recoveryIdx - peakIdx;
					} else {
						// Fallback to calendar days if indices not found (should not happen)
						const peak = new Date(currentEvent.peakDate!);
						const recovery = new Date(date);
						currentEvent.daysToRecover = Math.ceil((recovery.getTime() - peak.getTime()) / (1000 * 3600 * 24));
					}

					// 只有回撤幅度超过一定阈值 (例如 1%) 才记录，过滤噪音
					if (currentEvent.depthPercent! < -1.0) {
						// 强制类型转换，因为我们知道这些字段一定存在
						events.push(currentEvent as import('../types').DrawdownEvent);
					}
					currentEvent = null;
				}

				// 2. 更新新的峰值
				runningMax = price;
				peakDate = date;

			} else {
				// --- 场景 B: 处于回撤中 (水下) ---

				const depth = ((price - runningMax) / runningMax) * 100;

				if (!currentEvent) {
					// 刚开始跌，初始化事件
					currentEvent = {
						rank: 0, // 稍后排序填充
						depthPercent: depth,
						peakDate: peakDate,
						peakPrice: runningMax,
						valleyDate: date,
						valleyPrice: price,
						recoveryDate: null,
						isRecovered: false,
						daysToRecover: 0 // 暂时未定
					};
				} else {
					// 已经在跌了，检查是不是跌得更深了
					if (depth < currentEvent.depthPercent!) {
						currentEvent.depthPercent = depth;
						currentEvent.valleyDate = date;
						currentEvent.valleyPrice = price;
					}
				}
			}
		}

		// --- 收尾: 处理直到回测结束还没回本的最后一次回撤 ---
		if (currentEvent) {
			// 计算截止到回测结束日期的天数 (交易日)
			const peakIdx = equityCurve.findIndex(p => p.date === currentEvent!.peakDate);
			const lastIdx = equityCurve.length - 1;
			
			if (peakIdx !== -1) {
				currentEvent.daysToRecover = lastIdx - peakIdx;
			} else {
				const lastDate = equityCurve[equityCurve.length - 1].date;
				const peak = new Date(currentEvent.peakDate!);
				const last = new Date(lastDate);
				currentEvent.daysToRecover = Math.ceil((last.getTime() - peak.getTime()) / (1000 * 3600 * 24));
			}

			if (currentEvent.depthPercent! < -1.0) {
				events.push(currentEvent as import('../types').DrawdownEvent);
			}
		}

		// --- 排序与排名 ---
		// 按跌幅从小到大排序 (例如 -50% 排在 -10% 前面)
		const sortedEvents = events.sort((a, b) => a.depthPercent - b.depthPercent);

		// 取前 N 名并标记 Rank
		return sortedEvents.slice(0, topN).map((e, index) => ({
			...e,
			rank: index + 1
		}));
	}
}
