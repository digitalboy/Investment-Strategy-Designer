// src/lib/backtest-engine.ts
import { StrategyConfig, Trigger, ETFData, BacktestResultDTO, ETFDataPoint, PerformanceMetrics, TradeStats } from '../types';

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

export class BacktestEngine {
	async runBacktest(
		strategy: StrategyConfig,
		etfData: ETFData
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
				if (this.checkTriggerCondition(trigger, filteredData, i, currentAccountStateSnapshot, currentClose)) {
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
		const chartData = this.prepareChartData(filteredData, executionState.accountHistory);

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

	private checkTriggerCondition(
		trigger: Trigger,
		data: ETFDataPoint[],
		currentIndex: number,
		_accountState: AccountState,
		_currentPrice: number
	): boolean {
		const condition = trigger.condition;

		switch (condition.type) {
			case 'drawdownFromPeak':
				return this.checkDrawdownFromPeak(condition.params, data, currentIndex);
			case 'priceStreak':
				return this.checkPriceStreak(condition.params, data, currentIndex);
			case 'newHigh':
				return this.checkNewHigh(condition.params, data, currentIndex);
			case 'newLow':
				return this.checkNewLow(condition.params, data, currentIndex);
			case 'periodReturn':
				return this.checkPeriodReturn(condition.params, data, currentIndex);
			case 'rsi':
				return this.checkRSI(condition.params, data, currentIndex);
			case 'maCross':
				return this.checkMACross(condition.params, data, currentIndex);
			default:
				return false;
		}
	}

	private checkDrawdownFromPeak(params: { days: number; percentage: number }, data: ETFDataPoint[], currentIndex: number): boolean {
		const startDateIndex = Math.max(0, currentIndex - params.days);
		const periodData = data.slice(startDateIndex, currentIndex + 1);

		// 找到周期内的最高价
		const peakPrice = Math.max(...periodData.map(d => d.h));
		const currentPrice = data[currentIndex].c;

		// 计算从高点的回撤百分比
		const drawdown = ((peakPrice - currentPrice) / peakPrice) * 100;

		return drawdown >= params.percentage;
	}

	private checkPriceStreak(params: { direction: 'up' | 'down'; count: number; unit: 'day' | 'week' }, data: ETFDataPoint[], currentIndex: number): boolean {
		const { direction, count, unit } = params;

		// 对于日线数据，我们只检查连续的天数
		if (unit !== 'day') {
			// 对于周线，需要先将日线数据聚合为周线
			// 这里我们简化为只处理日线数据
			console.warn('Currently only day unit is implemented for price streak check');
		}

		// 如果数据不够，返回false
		if (currentIndex < count - 1) {
			return false;
		}

		let streakCount = 0;
		for (let offset = 0; offset < count - 1; offset++) {
			const currentIdx = currentIndex - offset;
			const prevIdx = currentIdx - 1;

			if (prevIdx < 0) {
				return false;
			}

			const prevPrice = data[prevIdx].c;
			const currPrice = data[currentIdx].c;

			if (direction === 'up' && currPrice > prevPrice) {
				streakCount++;
			} else if (direction === 'down' && currPrice < prevPrice) {
				streakCount++;
			} else {
				return false;
			}
		}

		return streakCount === count - 1;
	}

	private checkNewHigh(params: { days: number }, data: ETFDataPoint[], currentIndex: number): boolean {
		const startDateIndex = Math.max(0, currentIndex - params.days);
		const periodData = data.slice(startDateIndex, currentIndex); // 不包括当前天

		if (periodData.length === 0) return false;

		const maxHistoricalPrice = Math.max(...periodData.map(d => d.h));
		const currentPrice = data[currentIndex].c;

		return currentPrice > maxHistoricalPrice;
	}

	private checkNewLow(params: { days: number }, data: ETFDataPoint[], currentIndex: number): boolean {
		const startDateIndex = Math.max(0, currentIndex - params.days);
		const periodData = data.slice(startDateIndex, currentIndex); // 不包括当前天

		if (periodData.length === 0) return false;

		const minHistoricalPrice = Math.min(...periodData.map(d => d.l));
		const currentPrice = data[currentIndex].c;

		return currentPrice < minHistoricalPrice;
	}

	private checkPeriodReturn(params: { days: number; percentage: number; direction: 'up' | 'down' }, data: ETFDataPoint[], currentIndex: number): boolean {
		const startDateIndex = Math.max(0, currentIndex - params.days);

		const startPrice = data[startDateIndex].c;
		const currentPrice = data[currentIndex].c;

		const returnPercentage = ((currentPrice - startPrice) / startPrice) * 100;

		if (params.direction === 'up') {
			return returnPercentage >= params.percentage;
		} else {
			return returnPercentage <= -params.percentage;
		}
	}

	/**
	 * 检查 RSI (相对强弱指标) 条件
	 *
	 * @param params 参数包含:
	 *   - period: 计算周期 (通常为 14)
	 *   - threshold: 阈值 (如 30 或 70)
	 *   - operator: 判断方向 ('above' > 阈值, 'below' < 阈值)
	 * @param data ETF数据点数组
	 * @param currentIndex 当前回测到的日期索引
	 */
	private checkRSI(
		params: { period: number; threshold: number; operator: 'above' | 'below' },
		data: ETFDataPoint[],
		currentIndex: number
	): boolean {
		const { period, threshold, operator } = params;

		// 1. 数据量检查
		// RSI 计算需要前一日的数据来计算涨跌幅，所以需要 period + 1 个数据点
		// 如果历史数据不足以计算指定周期的 RSI，直接返回 false
		if (currentIndex < period) {
			return false;
		}

		// 2. 计算周期内的总涨幅和总跌幅
		// 采用 Cutler's RSI 算法 (基于简单移动平均 SMA)，无状态，适合当前架构
		let sumGain = 0;
		let sumLoss = 0;

		// 回溯过去 period 天，计算每天的涨跌
		for (let i = 0; i < period; i++) {
			// 获取当天的索引和前一天的索引
			const idx = currentIndex - i;
			const prevIdx = idx - 1;

			// 计算价格变动 (收盘价 - 前一日收盘价)
			const change = data[idx].c - data[prevIdx].c;

			if (change > 0) {
				// 如果是涨，计入总涨幅
				sumGain += change;
			} else {
				// 如果是跌，计入总跌幅 (取绝对值)
				sumLoss += Math.abs(change);
			}
		}

		// 3. 计算平均涨幅 (AvgGain) 和 平均跌幅 (AvgLoss)
		const avgGain = sumGain / period;
		const avgLoss = sumLoss / period;

		// 4. 计算 RSI
		let rsi = 0;

		// 特殊情况处理：如果平均跌幅为 0，说明过去 N 天全是涨的，RSI 为 100
		if (avgLoss === 0) {
			rsi = 100;
		} else {
			// 正常计算：
			// RS (相对强弱值) = 平均涨幅 / 平均跌幅
			const rs = avgGain / avgLoss;
			// RSI 公式 = 100 - (100 / (1 + RS))
			rsi = 100 - (100 / (1 + rs));
		}

		// 5. 判断条件
		// 如果操作符是 'above' (例如 RSI > 70 超买区)，判断 rsi > threshold
		// 如果操作符是 'below' (例如 RSI < 30 超卖区)，判断 rsi < threshold
		if (operator === 'above') {
			return rsi > threshold;
		} else {
			return rsi < threshold;
		}
	}

	private checkMACross(params: { period: number; direction: 'above' | 'below' }, data: ETFDataPoint[], currentIndex: number): boolean {
		// 移动平均线交叉检查
		// 计算指定周期的移动平均线
		if (currentIndex < params.period) return false;

		const sliceEnd = currentIndex + 1;
		const sliceStart = sliceEnd - params.period;
		const periodData = data.slice(sliceStart, sliceEnd);

		const ma = periodData.reduce((sum, point) => sum + point.c, 0) / periodData.length;
		const currentPrice = data[currentIndex].c;
		const prevPrice = data[currentIndex - 1].c;

		if (params.direction === 'above') {
			// 当前价格从下往上穿过移动平均线
			const prevPriceBelowMA = prevPrice <= ma;
			const currentPriceAboveMA = currentPrice > ma;
			return prevPriceBelowMA && currentPriceAboveMA;
		} else {
			// 当前价格从上往下穿过移动平均线
			const prevPriceAboveMA = prevPrice >= ma;
			const currentPriceBelowMA = currentPrice < ma;
			return prevPriceAboveMA && currentPriceBelowMA;
		}
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
	): { strategy: PerformanceMetrics; benchmark: PerformanceMetrics } {
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
			}
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
		accountHistory: { [date: string]: AccountState }
	): {
		dates: string[];
		strategyEquity: number[];
		benchmarkEquity: number[];
		underlyingPrice: number[];
	} {
		const dates = Object.keys(accountHistory).sort();

		const strategyEquity = dates.map(date => accountHistory[date].totalValue);

		// 基准权益：假设初始资本全用于购买ETF
		const initialPrice = data[0].c;
		const initialCapital = accountHistory[dates[0]].totalValue;
		const sharesBought = initialCapital / initialPrice;

		const benchmarkEquity = data
			.filter(point => dates.includes(point.d))
			.map(point => point.c * sharesBought);

		const underlyingPrice = data
			.filter(point => dates.includes(point.d))
			.map(point => point.c);

		return {
			dates,
			strategyEquity,
			benchmarkEquity,
			underlyingPrice,
		};
	}
}
