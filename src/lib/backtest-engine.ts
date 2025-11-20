// src/lib/backtest-engine.ts
import { StrategyConfig, Trigger, ETFData, BacktestResultDTO, ETFDataPoint, PerformanceMetrics } from '../types';

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
		const initialAccountState: AccountState = {
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

		// 执行回测 - 遍历每一天
		for (let i = 0; i < filteredData.length; i++) {
			const currentData = filteredData[i];
			const currentDate = currentData.d;
			const currentPrice = currentData.c;

			// 计算当前总价值
			const currentTotalValue = initialAccountState.cash + (initialAccountState.positions * currentPrice);

			// 更新账户状态
			const currentAccountState: AccountState = {
				...initialAccountState,
				totalValue: currentTotalValue,
			};

			// 保存账户历史
			executionState.accountHistory[currentDate] = { ...currentAccountState };

			// 检查并执行触发器
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
				if (this.checkTriggerCondition(trigger, filteredData, i, currentAccountState, currentPrice)) {
					// 执行触发器动作
					this.executeTriggerAction(
						trigger,
						currentAccountState,
						currentPrice,
						currentDate,
						`Trigger ${j + 1}`
					);

					// 更新最后执行日期
					executionState.lastTriggerExecution[triggerId] = currentDate;
				}
			}

			// 更新初始账户状态以反映交易后的实际情况
			initialAccountState.cash = currentAccountState.cash;
			initialAccountState.positions = currentAccountState.positions;
			initialAccountState.tradeHistory = [...currentAccountState.tradeHistory];
		}

		// 计算性能指标
		const performance = this.calculatePerformance(filteredData, executionState.accountHistory, strategy.initialCapital);

		// 准备图表数据
		const chartData = this.prepareChartData(filteredData, executionState.accountHistory);

		return {
			metadata: {
				symbol: strategy.etfSymbol,
				period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
			},
			performance,
			charts: chartData,
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
		for (let i = currentIndex; i > currentIndex - count; i--) {
			const prevPrice = data[i - 1].c;
			const currPrice = data[i].c;

			if (direction === 'up' && currPrice > prevPrice) {
				streakCount++;
			} else if (direction === 'down' && currPrice < prevPrice) {
				streakCount++;
			} else {
				break;
			}
		}

		return streakCount >= count;
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

	// 这里应该实现RSI和MA交叉的检查
	private checkRSI(_params: { period: number; threshold: number; operator: 'above' | 'below' }, _data: ETFDataPoint[], _currentIndex: number): boolean {
		// RSI计算比较复杂，需要先计算RS
		// RSI = 100 - (100 / (1 + RS))
		// RS = 平均收益 / 平均损失

		// 简化实现 - 实际应用中需要完整实现RSI计算
		console.warn('RSI check is not fully implemented in this example');
		return false;
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
			quantity = this.calculateSellQuantity(action.value, accountState);
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
		switch (value.type) {
			case 'fixedAmount':
				return value.amount / currentPrice;
			case 'cashPercent':
				return (accountState.cash * value.amount / 100) / currentPrice;
			case 'totalValuePercent':
				const targetValue = accountState.totalValue * value.amount / 100;
				const currentValue = accountState.positions * currentPrice;
				const additionalValue = targetValue - currentValue;
				if (additionalValue > 0) {
					return additionalValue / currentPrice;
				}
				return 0;
			default:
				return 0;
		}
	}

	private calculateSellQuantity(
		value: { type: string; amount: number },
		accountState: AccountState
	): number {
		switch (value.type) {
			case 'fixedAmount':
				return value.amount / accountState.positions; // 这里需要修正，应该是固定金额对应的份额
			case 'positionPercent':
				return accountState.positions * value.amount / 100;
			case 'totalValuePercent':
				const targetValue = accountState.totalValue * value.amount / 100;
				const currentValue = accountState.positions * accountState.totalValue / (accountState.cash + accountState.positions);
				return Math.min(accountState.positions, targetValue / currentValue);
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
		_initialCapital: number
	): { strategy: PerformanceMetrics; benchmark: PerformanceMetrics } {
		// 获取所有日期的账户价值
		const dates = Object.keys(accountHistory).sort();

		if (dates.length === 0) {
			return {
				strategy: {
					totalReturn: 0,
					annualizedReturn: 0,
					maxDrawdown: 0,
					sharpeRatio: 0,
				},
				benchmark: {
					totalReturn: 0,
					annualizedReturn: 0,
					maxDrawdown: 0,
					sharpeRatio: 0,
				}
			};
		}

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
			},
			benchmark: {
				totalReturn: benchmarkTotalReturn,
				annualizedReturn: benchmarkAnnualizedReturn,
				maxDrawdown: benchmarkMaxDrawdown,
				sharpeRatio: benchmarkSharpeRatio,
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
