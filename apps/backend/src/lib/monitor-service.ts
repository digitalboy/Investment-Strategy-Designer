import { DatabaseService } from './database';
import { CacheService } from './cache';
import { EmailService } from './email-service';
import { IndicatorEngine } from './indicator-engine';
import { StrategyConfig, Trigger, ETFData } from '../types';

interface Env {
	etf_strategy_db: D1Database;
	ETF_STRATEGY_DATA: KVNamespace;
	RESEND_API_KEY?: string;
}

export class MonitorService {
	private db: DatabaseService;
	private cache: CacheService;
	private email: EmailService;

	constructor(env: Env) {
		this.db = new DatabaseService(env.etf_strategy_db);
		this.cache = new CacheService(env.ETF_STRATEGY_DATA);
		this.email = new EmailService(env.RESEND_API_KEY);
	}

	async runDailyCheck(ctx?: ExecutionContext): Promise<void> {
		console.log('Starting daily strategy monitor check...');

		// 1. 获取所有开启监控的策略
		const strategies = await this.db.getMonitoredStrategies();
		if (strategies.length === 0) {
			console.log('No monitored strategies found.');
			return;
		}

		console.log(`Found ${strategies.length} strategies to check.`);

		// 2. 预加载 VIX 数据 (所有策略通用，且需要完整历史数据)
		// 获取足够长的历史数据以支持长周期指标 (e.g. 250天新高, VIX streak)
		const endDate = new Date().toISOString().split('T')[0];
		const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 1.5).toISOString().split('T')[0]; // 1.5 years ago

		const vixRawData = await this.cache.getETFData({
			symbol: '^VIX',
			startDate,
			endDate,
			ctx
		});
		// 提取VIX历史收盘价序列
		const globalVixHistory = vixRawData?.data.map(d => d.c) || [];
		
		if (globalVixHistory.length === 0) {
			console.warn('未获取到VIX历史数据，VIX相关触发器将无法工作。');
		}

		// 3. 按 ETF Symbol 分组策略以减少数据请求
		const strategiesBySymbol = new Map<string, typeof strategies>();
		for (const strat of strategies) {
			try {
				const config = JSON.parse(strat.config) as StrategyConfig;
				const symbol = config.etfSymbol;
				if (!strategiesBySymbol.has(symbol)) {
					strategiesBySymbol.set(symbol, []);
				}
				strategiesBySymbol.get(symbol)!.push(strat);
			} catch (e) {
				console.error(`解析策略 ${strat.id} 配置时发生错误:`, e);
			}
		}

		// 4. 逐个 Symbol 处理
		for (const [symbol, strats] of strategiesBySymbol.entries()) {
			const etfData = await this.fetchData(symbol, ctx); // 获取ETF的历史数据
			
			if (!etfData || etfData.data.length === 0) {
				console.warn(`未获取到 ${symbol} 的数据，跳过相关策略。`);
				continue;
			}

			const currentPrice = etfData.data[etfData.data.length - 1].c; // 当前ETF收盘价
			const currentDate = etfData.data[etfData.data.length - 1].d; // 当前数据日期

			// 检查数据日期是否是最近的（例如今天或昨天），避免使用陈旧数据重复触发
			// 简单判断：如果最新数据日期与当前日期相差超过5天，则认为数据过旧
			const lastDataDate = new Date(currentDate);
			const now = new Date();
			const diffDays = (now.getTime() - lastDataDate.getTime()) / (1000 * 3600 * 24);
			if (diffDays > 5) { 
				console.warn(`数据 ${symbol} 过旧 (${currentDate}), 跳过处理。`);
				continue; 
			}

			// 为每个策略检查信号
			for (const strat of strats) {
				await this.checkStrategy(strat, etfData, currentPrice, currentDate, globalVixHistory);
			}
		}
		
		console.log('Daily check completed.');
	}

	/**
	 * 检查单个策略的触发器，并根据结果发送通知和邮件
	 * @param strategy 策略实体信息 (包含 user_id, email, config等)
	 * @param etfData ETF的历史数据 (包含足够历史用于指标计算)
	 * @param currentPrice 当前ETF价格
	 * @param currentDate 当前数据日期字符串
	 * @param vixHistory VIX的完整历史数据序列
	 */
	private async checkStrategy(
		strategy: any, // 期望是 StrategyEntity & { author_email: string; author_name?: string }
		etfData: ETFData, 
		currentPrice: number,
		currentDate: string, 
		vixHistory: number[] // VIX历史数据序列
	) {
		try {
			const config = JSON.parse(strategy.config) as StrategyConfig;
			const triggers = config.triggers;
			
			// 获取上次执行状态，用于冷却期判断
			const lastState = await this.db.getStrategyState(strategy.id) || {};
			const newState = { ...lastState };
			let hasTriggered = false;
			const triggeredDetails: string[] = []; // 收集触发的规则详情文本

			// 遍历策略中的每个触发器
			for (let i = 0; i < triggers.length; i++) {
				const trigger = triggers[i];
				const triggerId = `trigger_${i}`;
				
				// 1. 冷却期检查：如果该触发器有冷却期且上次触发时间在冷却期内，则跳过
				const lastFiredDate = lastState[triggerId];
				if (lastFiredDate && trigger.cooldown) {
					const tradingDaysSince = this.calculateTradingDaysBetween(lastFiredDate, currentDate, etfData.data);
					if (tradingDaysSince < trigger.cooldown.days) {
						console.log(`策略 ${strategy.name} 规则 #${i + 1} 处于冷却期，跳过。`);
						continue; // 冷却期内，跳过此触发器
					}
				}

				// 2. 条件检查：使用IndicatorEngine判断触发条件是否满足
				// 传入ETF历史数据和VIX历史数据
				const isConditionMet = IndicatorEngine.checkTriggerCondition(
					trigger,
					etfData.data, // ETF的完整历史数据
					etfData.data.length - 1, // 当前数据的索引，即最新一天
					vixHistory // VIX的完整历史数据
				);

				if (isConditionMet) {
					hasTriggered = true;
					newState[triggerId] = currentDate; // 更新该触发器的最后触发日期
					
					// 构建通知详情文本
					const detailText = this.getConditionDescription(trigger, config.etfSymbol, currentPrice, currentDate, vixHistory);
					const actionDesc = trigger.action.type === 'buy' ? '买入' : '卖出';
					const amountDesc = this.formatActionValue(trigger.action.value);

					triggeredDetails.push(
						`规则 #${i + 1} (${detailText}): 建议 ${actionDesc} ${amountDesc}`
					);
					console.log(`策略 ${strategy.name} 规则 #${i + 1} 触发: ${detailText}`);
				}
			}

			// 如果有任何触发器触发，则更新策略状态并发送通知/邮件
			if (hasTriggered) {
				await this.db.saveStrategyState(strategy.id, newState); // 保存新的触发状态
				
				// 发送站内信 (始终记录，无论是否开启邮件)
				const notificationTitle = `🔔 信号触发: ${strategy.name}`;
				const notificationContent = `[${config.etfSymbol}] 检测到 ${triggeredDetails.length} 个交易信号:\n` + triggeredDetails.join('\n'); // 多个触发详情用换行符分隔
				await this.db.createNotification(
					strategy.user_id,
					notificationTitle,
					notificationContent,
					'signal',
					{ strategyId: strategy.id, symbol: config.etfSymbol } // 元数据，方便前端跳转
				);
				console.log(`策略 ${strategy.name} 的站内信已创建。`);


				// 发送邮件 (如果用户开启了邮件通知)
				if (strategy.notifications_enabled && strategy.author_email) {
					await this.email.sendEmail({
						to: strategy.author_email,
						subject: `🔔 [信号触发] ${strategy.name} - ${config.etfSymbol}`,
						html: this.generateEmailHtml(strategy.name, config.etfSymbol, currentPrice, currentDate, triggeredDetails, vixHistory)
					});
					console.log(`策略 ${strategy.name} 的邮件通知已发送。`);
				}
			}

		} catch (error) {
			console.error(`处理策略 ${strategy.name} (${strategy.id}) 时发生错误:`, error);
		}
	}

	/**
	 * 从缓存服务获取指定Symbol的历史数据
	 * @param symbol 标的符号 (ETF或VIX)
	 * @param ctx Worker的ExecutionContext
	 * @returns ETFData数据或null
	 */
	private async fetchData(symbol: string, ctx?: ExecutionContext): Promise<ETFData | null> {
		// 获取足够长的历史数据以支持长周期指标 (e.g. 250天新高, VIX streak)
		const endDate = new Date().toISOString().split('T')[0];
		// 历史数据范围设置为1.5年，确保大部分指标有足够数据 (例如250个交易日 + 节假日等)
		const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 1.5).toISOString().split('T')[0]; 
		
		return this.cache.getETFData({
			symbol,
			startDate,
			endDate,
			ctx
		});
	}

	/**
	 * 计算两个日期之间的交易日天数 (基于ETF历史数据索引差)
	 * @param d1 上次触发日期
	 * @param d2 当前日期
	 * @param data ETF历史数据数组 (必须是按时间排序的)
	 * @returns 交易日天数差，如果 d1 不在数据中则返回 Infinity (视为已过期)
	 */
	private calculateTradingDaysBetween(d1: string, d2: string, data: import('../types').ETFDataPoint[]): number {
		// 优化：从后往前查找，因为通常 d2 是最新的，d1 是较新的
		// 或者使用二分查找？但这里数据量不大 (几百条)，简单的 findIndex 应该足够
		// 注意：d1 可能是很久以前的，data 可能只包含最近 1.5 年的数据
		
		// 1. 找到 d2 的索引 (当前日期)
		const idx2 = data.findIndex(p => p.d === d2);
		if (idx2 === -1) return 0; // 当前日期不在数据中？这是一个异常情况，默认为0防止错误触发

		// 2. 找到 d1 的索引 (上次触发日期)
		const idx1 = data.findIndex(p => p.d === d1);
		
		if (idx1 === -1) {
			// 如果 d1 不在当前加载的历史数据中，说明它太久远了，肯定超过了冷却期
			return Infinity;
		}

		return idx2 - idx1;
	}

	/**
	 * 格式化动作值，用于生成描述文本
	 * @param value 动作值参数
	 * @returns 格式化后的字符串
	 */
	private formatActionValue(value: { type: string; amount: number }): string {
		if (value.type === 'fixedAmount') return `$${value.amount}`;
		// 未来可以扩展，例如根据type判断是百分比还是其他单位
		return `${value.amount}% (${value.type})`;
	}

	/**
	 * 根据触发器条件生成详细描述文本
	 * @param trigger 完整的触发器对象
	 * @param etfSymbol ETF符号 (用于描述文本)
	 * @param currentPrice 当前ETF价格 (用于描述文本)
	 * @param currentDate 当前日期字符串 (用于描述文本)
	 * @param vixHistory VIX历史数据 (用于VIX相关条件的描述，获取当前值)
	 * @returns 格式化后的条件描述字符串
	 */
	private getConditionDescription(
		trigger: Trigger,
		etfSymbol: string,
		currentPrice: number,
		currentDate: string,
		vixHistory: number[] // 传入完整的VIX历史数据，用于获取当前VIX值
	): string {
		const c = trigger.condition;
		let description = '';

		// 为了准确描述，需要获取一些当前值
		const currentVix = vixHistory.length > 0 ? vixHistory[vixHistory.length - 1] : undefined;
		const currentVixStr = currentVix !== undefined ? currentVix.toFixed(2) : 'N/A';
		const currentPriceStr = currentPrice.toFixed(2); // 当前ETF价格

		switch (c.type) {
			case 'drawdownFromPeak':
				// 例如：当QQQ从 60 日高点回撤 > 15%
				description = `当${etfSymbol}从 ${c.params.days} 日高点回撤 > ${c.params.percentage}%`;
				break;
			case 'priceStreak':
				const streakDir = c.params.direction === 'up' ? '上涨' : '下跌';
				description = `当${etfSymbol}连续 ${c.params.count} 天${streakDir}`;
				break;
			case 'newHigh':
				description = `当${etfSymbol}创 ${c.params.days} 天新高`;
				break;
			case 'newLow':
				description = `当${etfSymbol}创 ${c.params.days} 天新低`;
				break;
			case 'periodReturn':
				const returnDir = c.params.direction === 'up' ? '上涨' : '下跌';
				description = `当${etfSymbol} ${c.params.days} 天内${returnDir}超过 ${c.params.percentage}%`;
				break;
			case 'rsi':
				const rsiOp = c.params.operator === 'above' ? '高于' : '低于';
				description = `当${etfSymbol}RSI(${c.params.period}) ${rsiOp} ${c.params.threshold}`;
				break;
			case 'maCross':
				const maDir = c.params.direction === 'above' ? '向上穿越' : '向下穿越'; // 使用 direction
				description = `当${etfSymbol} ${maDir} ${c.params.period} 日均线`;
				break;
			case 'vix':
				const vixOp = c.params.operator === 'above' ? '高于' : '低于';
				switch (c.params.mode || 'threshold') { // 默认模式兼容
					case 'threshold':
						description = `当VIX指数 ${vixOp} ${c.params.threshold} (当前: ${currentVixStr})`;
						break;
					case 'streak':
						const vixStreakDir = c.params.streakDirection === 'up' ? '上涨' : '下跌';
						description = `当VIX指数连续 ${c.params.streakCount} 天${vixStreakDir} (当前: ${currentVixStr})`;
						break;
					case 'breakout':
						const vixBreakoutType = c.params.breakoutType === 'high' ? '新高' : '新低';
						description = `当VIX指数创 ${c.params.breakoutDays} 天${vixBreakoutType} (当前: ${currentVixStr})`;
						break;
				}
				break;
			default:
				// @ts-ignore
				description = `未知条件类型: ${c.type}`;
		}
		return description;
	}

	/**
	 * 生成邮件正文的HTML内容
	 * @param name 策略名称
	 * @param symbol 标的符号
	 * @param currentPrice 当前标的价格
	 * @param currentDate 当前日期
	 * @param triggeredDetails 触发的规则详情列表
	 * @param vixHistory VIX历史数据 (用于邮件中的VIX当前值展示)
	 * @returns 邮件HTML字符串
	 */
	private generateEmailHtml(name: string, symbol: string, currentPrice: number, currentDate: string, triggeredDetails: string[], vixHistory: number[]): string {
		const listItems = triggeredDetails.map(d => `<li>${d}</li>`).join('');
		const currentVix = vixHistory.length > 0 ? vixHistory[vixHistory.length - 1] : undefined;
		const currentVixHtml = currentVix !== undefined ? `| <strong>VIX:</strong> ${currentVix.toFixed(2)}` : '';

		return `
			<h1>策略监控日报</h1>
			<p>检测时间: ${currentDate} (美股收盘)</p>

			<div style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 20px;">
				<h2 style="margin-top: 0;">📈 标的: ${symbol} (${name})</h2>
				<p><strong>当前价格:</strong> $${currentPrice.toFixed(2)} ${currentVixHtml}</p>
			</div>

			<hr />

			<h3>👇 以下规则已触发:</h3>

			<div class="alert-box">
				<ul>
					${listItems}
				</ul>
			</div>

			<hr />
			<p style="color: gray; font-size: 12px;">
				* 您收到此邮件是因为您开启了策略监控。
				<a href="https://your-app-domain.com/settings">关闭通知</a>
			</p>
		`;
	}
}

