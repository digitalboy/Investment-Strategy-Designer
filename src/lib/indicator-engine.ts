import { Trigger, ETFDataPoint } from '../types';

export class IndicatorEngine {
	static checkTriggerCondition(
		trigger: Trigger,
		data: ETFDataPoint[],
		currentIndex: number,
		vixHistory?: number[]
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
			case 'vix':
				if (!vixHistory || vixHistory.length === 0) return false;
				return this.checkVIX(condition.params, vixHistory);
			default:
				return false;
		}
	}

	static checkVIX(
		params: { 
			mode?: 'threshold' | 'streak' | 'breakout';
			threshold?: number; operator?: 'above' | 'below';
			streakDirection?: 'up' | 'down'; streakCount?: number;
			breakoutType?: 'high' | 'low'; breakoutDays?: number;
		}, 
		vixHistory: number[]
	): boolean {
		const mode = params.mode || 'threshold';
		const currentVix = vixHistory[vixHistory.length - 1];

		if (mode === 'threshold') {
			if (params.threshold === undefined || !params.operator) return false;
			if (params.operator === 'above') {
				return currentVix > params.threshold;
			} else {
				return currentVix < params.threshold;
			}
		}

		// Helper to convert number[] to Minimal ETFDataPoint[] for reusing existing logic
		// We only need 'c' (close) for these checks
		const mockData = vixHistory.map(v => ({ c: v } as ETFDataPoint));
		const currentIndex = mockData.length - 1;

		if (mode === 'streak') {
			if (!params.streakDirection || !params.streakCount) return false;
			return this.checkPriceStreak(
				{ direction: params.streakDirection, count: params.streakCount, unit: 'day' },
				mockData,
				currentIndex
			);
		}

		if (mode === 'breakout') {
			if (!params.breakoutType || !params.breakoutDays) return false;
			if (params.breakoutType === 'high') {
				return this.checkNewHigh({ days: params.breakoutDays }, mockData, currentIndex);
			} else {
				return this.checkNewLow({ days: params.breakoutDays }, mockData, currentIndex);
			}
		}

		return false;
	}

	static checkDrawdownFromPeak(params: { days: number; percentage: number }, data: ETFDataPoint[], currentIndex: number): boolean {
		const startDateIndex = Math.max(0, currentIndex - params.days);
		const periodData = data.slice(startDateIndex, currentIndex + 1);

		// 找到周期内的最高价
		const peakPrice = Math.max(...periodData.map(d => d.h));
		const currentPrice = data[currentIndex].c;

		// 计算从高点的回撤百分比
		const drawdown = ((peakPrice - currentPrice) / peakPrice) * 100;

		return drawdown >= params.percentage;
	}

	static checkPriceStreak(params: { direction: 'up' | 'down'; count: number; unit: 'day' | 'week' }, data: ETFDataPoint[], currentIndex: number): boolean {
		const { direction, count, unit } = params;

		if (unit !== 'day') {
			// 暂未实现周线逻辑
			return false;
		}

		// 确保有足够的数据点来检查连续性（至少需要 count 天的数据）
		// count是连续天数，所以需要从当前天算起往前数count天，总共count个数据点
		if (currentIndex < count - 1) { // 如果当前索引小于所需连续天数-1，则数据不足
			return false;
		}

		// 从当前天向前检查 count 天的连续性
		for (let offset = 0; offset < count; offset++) {
			const currentIdx = currentIndex - offset;      // 当前正在处理的日期索引
			const prevIdx = currentIdx - 1;         // 前一天的索引

			// 如果前一天数据不存在，则无法形成连续性
			if (prevIdx < 0) {
				return false;
			}

			const prevPrice = data[prevIdx].c; // 前一天的收盘价
			const currPrice = data[currentIdx].c; // 当前天或之前某天的收盘价

			if (direction === 'up') {
				if (!(currPrice > prevPrice)) return false; // 连续上涨条件不满足
			} else if (direction === 'down') {
				if (!(currPrice < prevPrice)) return false; // 连续下跌条件不满足
			}
		}

		// 如果循环完成，则说明连续性满足 count 天
		return true;
	}

	static checkNewHigh(params: { days: number }, data: ETFDataPoint[], currentIndex: number): boolean {
		const startDateIndex = Math.max(0, currentIndex - params.days);
		const periodData = data.slice(startDateIndex, currentIndex); // 不包括当前天

		if (periodData.length === 0) return false;

		// 周期内的最高价 (使用高价 'h')
		const maxHistoricalPrice = Math.max(...periodData.map(d => d.h === undefined ? d.c : d.h)); // 如果没有'h'，使用'c'
		// 当前收盘价
		const currentPrice = data[currentIndex].c;

		// 如果当前收盘价严格高于周期内最高价，则创N天新高
		return currentPrice > maxHistoricalPrice;
	}

	/**
	 * 检查当前价格是否创下 N 天新低
	 * @param params { days: number } 检查天数
	 * @param data ETF历史数据
	 * @param currentIndex 当前数据点索引
	 * @returns 是否创 N 天新低
	 */
	static checkNewLow(params: { days: number }, data: ETFDataPoint[], currentIndex: number): boolean {
		// 确保有足够的数据进行计算
		if (currentIndex < 0 || data.length === 0) return false;

		// 检查周期需要包含当前日期之前的数据
		const startDateIndex = Math.max(0, currentIndex - params.days);
		// 截取当前日期之前的周期内数据
		const periodData = data.slice(startDateIndex, currentIndex); 

		// 如果历史数据不足，则不能判断新低
		if (periodData.length === 0) return false;

		// 周期内的最低价 (使用低价 'l')
		const minHistoricalPrice = Math.min(...periodData.map(d => d.l === undefined ? d.c : d.l)); // 如果没有'l'，使用'c'
		// 当前收盘价
		const currentPrice = data[currentIndex].c;

		        return currentPrice < minHistoricalPrice;

			}

		

			/**

			 * 检查周期内回报率是否达到指定方向和百分比

			 * @param params { days: number; percentage: number; direction: 'up' | 'down' } 天数、百分比、方向

			 * @param data ETF历史数据

			 * @param currentIndex 当前数据点索引

			 * @returns 是否满足周期回报率条件

			 */

			static checkPeriodReturn(params: { days: number; percentage: number; direction: 'up' | 'down' }, data: ETFDataPoint[], currentIndex: number): boolean {

				// 确保有足够数据进行计算

				if (currentIndex < params.days) {

					return false;

				}

		

				// 计算起始日期索引

				const startDateIndex = currentIndex - params.days;

		

				// 起始日的收盘价

				const startPrice = data[startDateIndex].c;

				// 当前日的收盘价

				const currentPrice = data[currentIndex].c;

		

				// 避免除以零

				if (startPrice === 0) return false;

		

				// 计算周期内的回报百分比

				const returnPercentage = ((currentPrice - startPrice) / startPrice) * 100;

		

				// 根据方向判断

				if (params.direction === 'up') {

					return returnPercentage >= params.percentage;

				} else {

					// 下跌，回报率为负数，需要小于等于负的百分比

					return returnPercentage <= -params.percentage;

				}

			}

		

			/**

			 * 检查 RSI (相对强弱指标) 条件是否满足

			 * @param params { period: number; threshold: number; operator: 'above' | 'below' } 周期、阈值、操作符

			 * @param data ETF历史数据

			 * @param currentIndex 当前数据点索引

			 * @returns 是否满足RSI条件

			 */

			static checkRSI(

				params: { period: number; threshold: number; operator: 'above' | 'below' },

				data: ETFDataPoint[],

				currentIndex: number

			): boolean {

				const { period, threshold, operator } = params;

		

				// RSI 计算需要足够长的数据历史

				// 至少需要 period + 1 个数据点才能计算第一个 RSI 值 (period天前的变化量)

				if (currentIndex < period) { 

					return false;

				}

		

				let sumGain = 0; // 周期内总上涨幅度

				let sumLoss = 0; // 周期内总下跌幅度

		

				// 从当前天向前回溯 period 天，计算每天的涨跌

				// 注意：这里的循环是计算最近 period 天的变化总和

				for (let i = 0; i < period; i++) {

					const idx = currentIndex - i;      // 当前正在处理的日期索引

					const prevIdx = idx - 1;         // 前一天的索引

		

					// 如果数据不足以计算，直接返回 false

					if (prevIdx < 0) return false;

		

					const change = data[idx].c - data[prevIdx].c; // 当前天收盘价 - 前一天收盘价

		

					if (change > 0) {

						sumGain += change;

					} else {

						sumLoss += Math.abs(change); // 下跌取绝对值

					}

				}

		

				const avgGain = sumGain / period; // 平均上涨幅度

				const avgLoss = sumLoss / period; // 平均下跌幅度

		

				let rsi = 0;

				if (avgLoss === 0) {

					rsi = 100; // 如果平均跌幅为0，RSI为100（极端强势）

				} else {

					const rs = avgGain / avgLoss; // 相对强度

					rsi = 100 - (100 / (1 + rs)); // RSI计算公式

				}

		

				// 根据操作符判断RSI是否满足条件

				if (operator === 'above') {

					return rsi > threshold;

				} else {

					return rsi < threshold;

				}

			}

		

			/**

			 * 检查移动平均线（MA）交叉条件

			 * @param params { period: number; direction: 'above' | 'below' } 周期、方向

			 * @param data ETF历史数据

			 * @param currentIndex 当前数据点索引

			 * @returns 是否满足MA交叉条件

			 */

			static checkMACross(params: { period: number; direction: 'above' | 'below' }, data: ETFDataPoint[], currentIndex: number): boolean {

				// 确保有足够的数据计算移动平均线

				if (currentIndex < params.period) return false;

		

				// 计算当前周期的移动平均线

				const sliceEnd = currentIndex + 1;

				const sliceStart = sliceEnd - params.period;

				const periodDataForMA = data.slice(sliceStart, sliceEnd);

				const ma = periodDataForMA.reduce((sum, point) => sum + point.c, 0) / periodDataForMA.length;

		

				const currentPrice = data[currentIndex].c; // 当前收盘价

				const prevPrice = data[currentIndex - 1].c; // 前一天的收盘价

		

				if (params.direction === 'above') {

					// 金叉：前一日价格低于或等于MA，当前价格高于MA (向上穿越)

					const prevPriceBelowMA = prevPrice <= ma;

					const currentPriceAboveMA = currentPrice > ma;

					return prevPriceBelowMA && currentPriceAboveMA;

				} else {

					// 死叉：前一日价格高于或等于MA，当前价格低于或等于MA (向下穿越)

					const prevPriceAboveMA = prevPrice >= ma;

					const currentPriceBelowMA = currentPrice < ma;

					return prevPriceAboveMA && currentPriceBelowMA;

				}

			}

		
}
