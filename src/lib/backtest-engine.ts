// src/lib/backtest-engine.ts
import { StrategyConfig, Trigger, ETFData, BacktestResultDTO, ETFDataPoint, PerformanceMetrics, TradeStats } from '../types';
import { IndicatorEngine } from './indicator-engine';

interface AccountState {
	cash: number;
	positions: number; // 持有的ETF份额
	totalValue: number; // 账户总价值
	tradeHistory: TradeRecord[];
}

interface TradeRecord {
	date: string;
	action: 'buy' | 'sell';
	quantity: number;
	price: number;
	reason: string;
}

interface ExecutionState {
	lastTriggerExecution: { [triggerId: string]: string }; // 记录每个触发器的最后执行日期
	accountHistory: { [date: string]: AccountState }; // 每日账户状态
}

export interface MarketContext {
	vixData?: Map<string, number>;
}

export class BacktestEngine {
	async runBacktest(
		strategy: StrategyConfig,
		etfData: ETFData,
		context: MarketContext = {}
	): Promise<BacktestResultDTO> {
		// 初始化账户状态
		const accountState: AccountState = {
			cash: strategy.initialCapital,
			positions: 0,
			totalValue: strategy.initialCapital,
			tradeHistory: [],
		};

		// 按日期排序的ETF数据
		const sortedData = [...etfData.data].sort((a, b) =>
			new Date(a.d).getTime() - new Date(b.d).getTime()
		);

		// 获取指定日期范围的数据
		const startDate = strategy.startDate ? new Date(strategy.startDate) : new Date(sortedData[0].d);
		const endDate = strategy.endDate ? new Date(strategy.endDate) : new Date(sortedData[sortedData.length - 1].d);

		const filteredData = sortedData.filter(point => {
			const pointDate = new Date(point.d);
			return pointDate >= startDate && pointDate <= endDate;
		});

		// 初始化执行状态
		const executionState: ExecutionState = {
			lastTriggerExecution: {},
			accountHistory: {},
		};

		// 待处理订单 (用于次日开盘执行)
		let pendingOrders: { trigger: Trigger; triggerId: string; reason: string }[] = [];

		// 预处理 VIX 数据 (与 filteredData 对齐)
		const alignedVixData: number[] = [];
		if (context.vixData) {
			filteredData.forEach(point => {
				const val = context.vixData!.get(point.d);
				// 如果某天缺失 VIX，用前一天填充或 NaN，这里暂用 NaN
				// 但为了 streak 计算，最好是连续的。
				// 简单策略：如果当天没有，就沿用前一天，如果第一天就没有，用 0
				const lastVal = alignedVixData.length > 0 ? alignedVixData[alignedVixData.length - 1] : 0;
				alignedVixData.push(val !== undefined ? val : lastVal);
			});
		}

		// 执行回测 - 遍历每一天
		for (let i = 0; i < filteredData.length; i++) {
			const currentData = filteredData[i];
			const currentDate = currentData.d;
			const currentClose = currentData.c;
			const currentOpen = currentData.o;

			// 1. 执行待处理订单 (使用当日开盘价)
			if (pendingOrders.length > 0) {
				for (const order of pendingOrders) {
					this.executeTriggerAction(
						order.trigger,
						accountState,
						currentOpen, // 使用开盘价执行
						currentDate,
						order.reason
					);
				}
				pendingOrders = [];
			}

			// 2. 更新账户价值 (使用当日收盘价)
			const currentTotalValue = accountState.cash + (accountState.positions * currentClose);

			// 更新账户状态快照
			const currentAccountStateSnapshot: AccountState = {
				...accountState,
				totalValue: currentTotalValue,
			};

			// 保存账户历史
			executionState.accountHistory[currentDate] = { ...currentAccountStateSnapshot };

			// 准备 VIX 历史数据片段 (从开始到今天)
			// 注意：这在数据量大时可能有性能损耗，但对于 VIX 策略是必要的
			const currentVixHistory = alignedVixData.length > 0 ? alignedVixData.slice(0, i + 1) : undefined;

			// 3. 检查触发器 (使用当日收盘数据)
			for (let j = 0; j < strategy.triggers.length; j++) {
				const trigger = strategy.triggers[j];
				const triggerId = `trigger_${j}`;

				// 检查冷却期
				const lastExecutionDate = executionState.lastTriggerExecution[triggerId];
				if (lastExecutionDate && trigger.cooldown) {
					const daysSinceLastExecution = this.calculateDaysBetween(lastExecutionDate, currentDate);
					if (daysSinceLastExecution < trigger.cooldown.days) {
						continue; // 冷却期内，跳过此触发器
					}
				}

				// 检查触发器条件
				if (IndicatorEngine.checkTriggerCondition(trigger, filteredData, i, currentVixHistory)) {
					// 添加到待处理订单，将在下一天开盘执行
					pendingOrders.push({
						trigger,
						triggerId,
						reason: `Trigger ${j + 1} (Signal on ${currentDate})`
					});

					// 更新最后执行日期 (标记为今日触发)
					executionState.lastTriggerExecution[triggerId] = currentDate;
				}
			}
		}

		// 计算性能指标
		const performance = this.calculatePerformance(filteredData, executionState.accountHistory, strategy.initialCapital, accountState.tradeHistory);

		// 准备图表数据
		const chartData = this.prepareChartData(filteredData, executionState.accountHistory, strategy.initialCapital, context);

		return {
			metadata: {
				symbol: strategy.etfSymbol,
				period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
			},
			performance,
			charts: chartData,
			trades: accountState.tradeHistory
		};
	}

	private executeTriggerAction(
		trigger: Trigger,
		accountState: AccountState,
		currentPrice: number,
		currentDate: string,
		reason: string
	): void {
		const action = trigger.action;

		// 计算执行数量
		let quantity = 0;
		if (action.type === 'buy') {
			quantity = this.calculateBuyQuantity(action.value, accountState, currentPrice);
			if (quantity > 0) {
				// 执行买入
				const cost = quantity * currentPrice;
				accountState.cash -= cost;
				accountState.positions += quantity;

				// 记录交易
				accountState.tradeHistory.push({
					date: currentDate,
					action: 'buy',
					quantity,
					price: currentPrice,
					reason,
				});
			}
		} else if (action.type === 'sell') {
			quantity = this.calculateSellQuantity(action.value, accountState, currentPrice);
			if (quantity > 0) {
				// 确保不会卖出超过持有的数量
				quantity = Math.min(quantity, accountState.positions);

				// 执行卖出
				const proceeds = quantity * currentPrice;
				accountState.cash += proceeds;
				accountState.positions -= quantity;

				// 记录交易
				accountState.tradeHistory.push({
					date: currentDate,
					action: 'sell',
					quantity,
					price: currentPrice,
					reason,
				});
			}
		}
	}

	private calculateBuyQuantity(
		value: { type: string; amount: number },
		accountState: AccountState,
		currentPrice: number
	): number {
		let amountToSpend = 0;

		switch (value.type) {
			case 'fixedAmount':
				amountToSpend = value.amount;
				break;
			case 'cashPercent':
				amountToSpend = accountState.cash * value.amount / 100;
				break;
			case 'totalValuePercent':
				const targetValue = accountState.totalValue * value.amount / 100;
				const currentValue = accountState.positions * currentPrice;
				const additionalValue = targetValue - currentValue;
				if (additionalValue > 0) {
					amountToSpend = additionalValue;
				}
				break;
			default:
				amountToSpend = 0;
		}

		// 核心修正：确保购买金额不超过可用现金
		amountToSpend = Math.min(amountToSpend, accountState.cash);

		if (amountToSpend <= 0) return 0;
		return amountToSpend / currentPrice;
	}

	private calculateSellQuantity(
		value: { type: string; amount: number },
		accountState: AccountState,
		currentPrice: number
	): number {
		switch (value.type) {
			case 'fixedAmount':
				return value.amount / currentPrice;
			case 'positionPercent':
				return accountState.positions * value.amount / 100;
			case 'totalValuePercent':
				// 卖出直到持仓价值等于总价值的百分比
				const targetValue = accountState.totalValue * value.amount / 100;
				const currentPositionValue = accountState.positions * currentPrice;
				const amountToSell = currentPositionValue - targetValue;

				if (amountToSell > 0) {
					return amountToSell / currentPrice;
				}
				return 0;
			default:
				return 0;
		}
	}

	private calculateDaysBetween(startDate: string, endDate: string): number {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const timeDiff = end.getTime() - start.getTime();
		return Math.ceil(timeDiff / (1000 * 3600 * 24));
	}

	private calculatePerformance(
		data: ETFDataPoint[],
		accountHistory: { [date: string]: AccountState },
		initialCapital: number,
		tradeHistory: TradeRecord[]
	): { strategy: PerformanceMetrics; benchmark: PerformanceMetrics; dca: PerformanceMetrics } {
		// 获取所有日期的账户价值
		const dates = Object.keys(accountHistory).sort();

		// 默认空统计
		const emptyStats: TradeStats = {
			totalTrades: 0,
			buyCount: 0,
			sellCount: 0,
			totalInvested: 0,
			totalProceeds: 0
		};

		if (dates.length === 0) {
			return {
				strategy: {
					totalReturn: 0,
					annualizedReturn: 0,
					maxDrawdown: 0,
					sharpeRatio: 0,
					tradeStats: emptyStats
				},
				benchmark: {
					totalReturn: 0,
					annualizedReturn: 0,
					maxDrawdown: 0,
					sharpeRatio: 0,
					tradeStats: emptyStats
				},
				dca: {
					totalReturn: 0,
					annualizedReturn: 0,
					maxDrawdown: 0,
					sharpeRatio: 0,
					tradeStats: emptyStats
				}
			};
		}

		// 计算策略交易统计
		const buyTrades = tradeHistory.filter(t => t.action === 'buy');
		const sellTrades = tradeHistory.filter(t => t.action === 'sell');

		const strategyTradeStats: TradeStats = {
			totalTrades: tradeHistory.length,
			buyCount: buyTrades.length,
			sellCount: sellTrades.length,
			totalInvested: buyTrades.reduce((sum, t) => sum + (t.quantity * t.price), 0),
			totalProceeds: sellTrades.reduce((sum, t) => sum + (t.quantity * t.price), 0)
		};

		// 计算基准交易统计 (假设期初全仓买入)
		const benchmarkTradeStats: TradeStats = {
			totalTrades: 1,
			buyCount: 1,
			sellCount: 0,
			totalInvested: initialCapital,
			totalProceeds: 0
		};

		// 计算策略性能
		const strategyValues = dates.map(date => accountHistory[date].totalValue);
		const strategyStartValue = strategyValues[0];
		const strategyEndValue = strategyValues[strategyValues.length - 1];
		const strategyTotalReturn = ((strategyEndValue - strategyStartValue) / strategyStartValue) * 100;

		// 计算基准（买入持有）性能
		const benchmarkStartPrice = data[0].c;
		const benchmarkEndPrice = data[data.length - 1].c;
		const benchmarkTotalReturn = ((benchmarkEndPrice - benchmarkStartPrice) / benchmarkStartPrice) * 100;

		// 计算最大回撤（简化版）
		let strategyMaxDrawdown = this.calculateMaxDrawdown(strategyValues);
		let benchmarkMaxDrawdown = this.calculateMaxDrawdown(
			data.map(d => d.c) // 假设基准从100开始，比例相同
		);

		// 计算年化收益率
		const startDate = new Date(dates[0]);
		const endDate = new Date(dates[dates.length - 1]);
		const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

		const strategyAnnualizedReturn = years > 0 ?
			(Math.pow(strategyEndValue / strategyStartValue, 1 / years) - 1) * 100 : 0;
		const benchmarkAnnualizedReturn = years > 0 ?
			(Math.pow(benchmarkEndPrice / benchmarkStartPrice, 1 / years) - 1) * 100 : 0;

		// 计算夏普比率（简化版，假设无风险利率为0）
		const strategySharpeRatio = this.calculateSharpeRatio(strategyValues);
		const benchmarkSharpeRatio = this.calculateSharpeRatio(data.map(d => d.c));

		// 计算 DCA 基准性能
		const dcaResult = this.calculateWeeklyDCABenchmark(data, dates, initialCapital);

		return {
			strategy: {
				totalReturn: strategyTotalReturn,
				annualizedReturn: strategyAnnualizedReturn,
				maxDrawdown: strategyMaxDrawdown,
				sharpeRatio: strategySharpeRatio,
				tradeStats: strategyTradeStats,
			},
			benchmark: {
				totalReturn: benchmarkTotalReturn,
				annualizedReturn: benchmarkAnnualizedReturn,
				maxDrawdown: benchmarkMaxDrawdown,
				sharpeRatio: benchmarkSharpeRatio,
				tradeStats: benchmarkTradeStats,
			},
			dca: dcaResult.stats
		};
	}

	private calculateMaxDrawdown(values: number[]): number {
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

	private calculateSharpeRatio(values: number[]): number {
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

	private prepareChartData(
		data: ETFDataPoint[],
		accountHistory: { [date: string]: AccountState },
		initialCapital: number,
		context?: MarketContext
	): {
		dates: string[];
		strategyEquity: number[];
		benchmarkEquity: number[];
		dcaEquity: number[];
		underlyingPrice: number[];
		vixData?: number[];
	} {
		const dates = Object.keys(accountHistory).sort();

		const strategyEquity = dates.map(date => accountHistory[date].totalValue);

		// 基准权益：假设初始资本全用于购买ETF
		const initialPrice = data[0].c;
		const initialCapitalValue = accountHistory[dates[0]].totalValue;
		const sharesBought = initialCapitalValue / initialPrice;

		const benchmarkEquity = data
			.filter(point => dates.includes(point.d))
			.map(point => point.c * sharesBought);

		// 计算 DCA 净值曲线
		const dcaResult = this.calculateWeeklyDCABenchmark(data, dates, initialCapital);
		const dcaEquity = dcaResult.equityCurve;

		const underlyingPrice = data
			.filter(point => dates.includes(point.d))
			.map(point => point.c);

		let vixData: number[] | undefined;
		if (context?.vixData && context.vixData.size > 0) {
			// 如果 context 中有 VIX 数据，则将其映射到 dates
			vixData = dates.map(date => context.vixData?.get(date) || 0);
		}

		return {
			dates,
			strategyEquity,
			benchmarkEquity,
			dcaEquity,
			underlyingPrice,
			vixData
		};
	}

	/**
	 * 获取日期的 ISO 周标识 (格式: "YYYY-Wxx")
	 * 确保跨年周（如12月31日属于下一年的第一周）计算正确
	 */
	private getWeekIdentifier(dateStr: string): string {
		const date = new Date(dateStr);
		date.setHours(0, 0, 0, 0);
		// 将日期设置为本周四，这是 ISO-8601 定义周数的标准方式
		date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		const week1 = new Date(date.getFullYear(), 0, 4);
		// 计算周数
		const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

		return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
	}

	/**
	 * 计算基准2：周定投 (Weekly DCA)
	 * 策略：每周的第一个交易日（通常是周一，遇假期顺延）定额买入
	 *
	 * 采用"资本耗尽模型"：预先计算总周数，将本金平均分配到每周，
	 * 确保回测结束时本金刚好全部投完，消除现金拖累误差。
	 */
	private calculateWeeklyDCABenchmark(
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
		// 这确保了资金在时间维度上的完美均匀分布
		const weeklyAmount = initialCapital / totalWeeks;

		// --- 阶段 3: 模拟交易 ---
		let cash = initialCapital;
		let positions = 0;
		let lastWeekId = '';
		const equityCurve: number[] = [];
		let buyCount = 0;
		let totalInvested = 0;

		// 设置微小阈值处理浮点数比较
		const EPSILON = 0.0001;

		for (const point of filteredData) {
			const currentWeekId = this.getWeekIdentifier(point.d);
			const currentPrice = point.c;

			// 触发条件：
			// 1. 遇到了新的一周 (WeekID 变化)
			// 2. 账户里还有钱 (Cash > EPSILON)
			if (currentWeekId !== lastWeekId && cash > EPSILON) {

				// 确定本次买入金额
				// 正常情况下买 weeklyAmount
				// 如果是最后一周或者余额不足一个单位，则 All-in 余额
				let investAmount = weeklyAmount;
				if (cash < weeklyAmount + EPSILON) {
					investAmount = cash; // 花光剩余现金
				}

				// 执行买入 (假设支持碎股交易)
				const quantity = investAmount / currentPrice;
				positions += quantity;
				cash -= investAmount;
				buyCount++;
				totalInvested += investAmount;

				// 强制修正：防止出现极其微小的负数或残留
				if (cash < EPSILON) cash = 0;

				// 更新周标识，防止本周重复买入
				lastWeekId = currentWeekId;
			}

			// 计算当日总资产 (现金 + 持仓市值)
			const totalValue = cash + (positions * currentPrice);
			equityCurve.push(totalValue);
		}

		// --- 阶段 4: 计算性能指标 ---
		if (equityCurve.length === 0) {
			return { equityCurve: [], stats: emptyStats };
		}

		const startValue = initialCapital; // DCA 起点是本金
		const endValue = equityCurve[equityCurve.length - 1];

		// 1. 总回报
		const totalReturn = ((endValue - startValue) / startValue) * 100;

		// 2. 年化回报
		const startDate = new Date(dates[0]);
		const endDate = new Date(dates[dates.length - 1]);
		const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
		const annualizedReturn = years > 0 ? (Math.pow(endValue / startValue, 1 / years) - 1) * 100 : 0;

		// 3. 最大回撤
		const maxDrawdown = this.calculateMaxDrawdown(equityCurve);

		// 4. 夏普比率
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
}
