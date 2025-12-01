// src/lib/backtest-engine.ts
import { StrategyConfig, Trigger, ETFData, BacktestResultDTO, ETFDataPoint, AccountState, PerformanceMetrics } from '../types';
import { IndicatorEngine } from './indicator-engine';
import { PositionSizer } from './position-sizer';
import { PerformanceAnalyzer } from './performance-analyzer';
import { AdaptiveTrendBenchmark3_3 } from './benchmarks/adaptive-trend-3-3';
import { BuyAndHoldBenchmark } from './benchmarks/buy-and-hold';
import { WeeklyDCABenchmark } from './benchmarks/weekly-dca';

interface ExecutionState {
	lastTriggerExecutionIndex: { [triggerId: string]: number }; // 记录每个触发器的最后执行索引 (交易日)
	accountHistory: { [date: string]: AccountState }; // 每日账户状态
}

export interface MarketContext {
	vixData?: Map<string, number>;
	tnxData?: Map<string, number>; // US 10-Year Treasury Yield (^TNX)
	dcaAcceleration?: number; // Optional: for Smart Weekly DCA acceleration rate
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
			lastTriggerExecutionIndex: {},
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

				// 检查冷却期 (使用交易日索引)
				const lastExecutionIndex = executionState.lastTriggerExecutionIndex[triggerId];
				if (lastExecutionIndex !== undefined && trigger.cooldown) {
					const daysSinceLastExecution = i - lastExecutionIndex;
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

					// 更新最后执行索引 (标记为今日触发)
					executionState.lastTriggerExecutionIndex[triggerId] = i;
				}
			}
		} // <-- This closing brace correctly ends the main 'for' loop

		// 准备图表数据 (包括了 Buy&Hold 和 DCA 基准的计算)
		const chartData = this.prepareChartData(filteredData, executionState.accountHistory, strategy.initialCapital, context);

		// 计算性能指标 (只计算用户策略的)
		const strategyStats = PerformanceAnalyzer.calculateMetricsFromCurve(
			chartData.strategyEquity,
			chartData.dates,
			{ // 从 accountState.tradeHistory 聚合 TradeStats
				totalTrades: accountState.tradeHistory.length,
				buyCount: accountState.tradeHistory.filter(t => t.action === 'buy').length,
				sellCount: accountState.tradeHistory.filter(t => t.action === 'sell').length,
				totalInvested: accountState.tradeHistory.filter(t => t.action === 'buy').reduce((sum, t) => sum + (t.quantity * t.price), 0),
				totalProceeds: accountState.tradeHistory.filter(t => t.action === 'sell').reduce((sum, t) => sum + (t.quantity * t.price), 0)
			},
			strategy.initialCapital
		);

		// Calculate Multi-Factor Scoring Benchmark (Using Adaptive Trend Logic)
		const scoringBenchmark = new AdaptiveTrendBenchmark3_3();
		const scoringResult = scoringBenchmark.calculate(
			filteredData,
			chartData.dates,
			strategy.initialCapital,
			context // Pass full context or needed parts
		);

		// 准备净值曲线数据用于回撤分析
		const equityCurve = chartData.dates.map((date: string, i: number) => ({
			date,
			value: chartData.strategyEquity[i]
		}));

		// 计算最大回撤事件
		const topDrawdowns = PerformanceAnalyzer.calculateTopDrawdowns(equityCurve);

		return {
			metadata: {
				symbol: strategy.etfSymbol,
				period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
			},
			performance: {
				strategy: strategyStats,
				benchmark: chartData.benchmarkStats, // 来自 BuyAndHoldBenchmark
				dca: chartData.dcaStats,             // 来自 WeeklyDCABenchmark
				scoring: scoringResult.stats
			},
			analysis: {
				topDrawdowns
			},
			charts: {
				dates: chartData.dates,
				strategyEquity: chartData.strategyEquity,
				benchmarkEquity: chartData.benchmarkEquity,
				dcaEquity: chartData.dcaEquity,
				scoringEquity: scoringResult.equityCurve,
				underlyingPrice: chartData.underlyingPrice,
				vixData: chartData.vixData,
				tnxData: chartData.tnxData
			},
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
			quantity = PositionSizer.calculateBuyQuantity(action.value, accountState, currentPrice);
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
			quantity = PositionSizer.calculateSellQuantity(action.value, accountState, currentPrice);
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

	private calculateDaysBetween(startDate: string, endDate: string): number {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const timeDiff = end.getTime() - start.getTime();
		return Math.ceil(timeDiff / (1000 * 3600 * 24));
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
		benchmarkStats: PerformanceMetrics;
		dcaEquity: number[];
		dcaStats: PerformanceMetrics;
		underlyingPrice: number[];
		vixData?: number[];
		tnxData?: number[];
	} {
		const dates = Object.keys(accountHistory).sort();

		const strategyEquity = dates.map(date => accountHistory[date].totalValue);

		// 基准1：买入并持有
		const buyAndHoldBenchmark = new BuyAndHoldBenchmark();
		const bnhResult = buyAndHoldBenchmark.calculate(data, dates, initialCapital);
		const benchmarkEquity = bnhResult.equityCurve;

		// 基准2：周定投
		const weeklyDCABenchmark = new WeeklyDCABenchmark();
		const dcaResult = weeklyDCABenchmark.calculate(data, dates, initialCapital, context);
		const dcaEquity = dcaResult.equityCurve;

		const underlyingPrice = data
			.filter(point => dates.includes(point.d))
			.map(point => point.c);

		let vixData: number[] | undefined;
		if (context?.vixData && context.vixData.size > 0) {
			// 如果 context 中有 VIX 数据，则将其映射到 dates
			vixData = dates.map(date => context.vixData?.get(date) || 0);
		}

		let tnxData: number[] | undefined;
		if (context?.tnxData && context.tnxData.size > 0) {
			// 如果 context 中有 TNX 数据，则将其映射到 dates
			tnxData = dates.map(date => context.tnxData?.get(date) || 0);
		}

		return {
			dates,
			strategyEquity,
			benchmarkEquity,
			benchmarkStats: bnhResult.stats,
			dcaEquity,
			dcaStats: dcaResult.stats,
			underlyingPrice,
			vixData,
			tnxData
		};
	}
}
