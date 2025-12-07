<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import type { BacktestResultDTO, DrawdownEvent } from '@/types'
import type { ChartAnnotationMarket } from '@/services/polymarketService'

const { t } = useI18n()

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler, annotationPlugin)

const props = defineProps<{
	result: BacktestResultDTO
	selectedDrawdown?: DrawdownEvent | null
	selectedMarket?: ChartAnnotationMarket | null
}>()

// 创建渐变色的函数
const createGradient = (ctx: CanvasRenderingContext2D, chartArea: any, colorStart: string, colorEnd: string) => {
	const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
	gradient.addColorStop(0, colorStart)
	gradient.addColorStop(1, colorEnd)
	return gradient
}

const chartData = computed(() => {
	if (!props.result) return { labels: [], datasets: [] }

	const trades = props.result.trades || []
	const dates = props.result.charts.dates || []
	const strategyEquity = props.result.charts.strategyEquity || []

	const toNumber = (value: unknown): number | undefined => {
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : undefined
	}

	const equityPairs: [string, number][] = []
	dates.forEach((date, idx) => {
		const numericValue = toNumber(strategyEquity[idx])
		if (numericValue !== undefined) {
			equityPairs.push([date, numericValue])
		}
	})

	const equityMap = new Map<string, number>(equityPairs)
	const numericEquity = equityPairs.map(([, value]) => value)
	const equityRange = numericEquity.length ? Math.max(...numericEquity) - Math.min(...numericEquity) : 0
	const fallbackBase = numericEquity.length ? numericEquity[numericEquity.length - 1]! : 1
	const markerOffset = algebraicOffset(equityRange, fallbackBase)

	function algebraicOffset(range: number, base: number) {
		if (range > 0) {
			return Math.max(range * 0.02, 1)
		}
		return Math.max(base * 0.02, 1)
	}

	const mapTradePoint = (trade: any, direction: 'buy' | 'sell') => {
		const resolvedBase = equityMap.get(trade.date)
		const baseValue = resolvedBase === undefined ? fallbackBase : resolvedBase
		const offset = direction === 'buy' ? markerOffset : -markerOffset
		return {
			x: trade.date,
			y: baseValue + offset,
			price: trade.price,
			amount: trade.quantity * trade.price,
			quantity: trade.quantity,
			reason: trade.reason
		}
	}

	const buyPoints = trades
		.filter(t => t.action === 'buy')
		.map(t => mapTradePoint(t, 'buy')) as any[];

	const sellPoints = trades
		.filter(t => t.action === 'sell')
		.map(t => mapTradePoint(t, 'sell')) as any[];

	return {
		labels: props.result.charts.dates,
		datasets: [
			{
				label: t('strategy.backtestChart.myStrategy'),
				backgroundColor: (context: any) => {
					const chart = context.chart
					const { ctx, chartArea } = chart
					if (!chartArea) return 'rgba(16, 185, 129, 0.3)'
					return createGradient(ctx, chartArea, 'rgba(16, 185, 129, 0.4)', 'rgba(16, 185, 129, 0)')
				},
				borderColor: '#10b981',
				borderWidth: 2,
				data: props.result.charts.strategyEquity,
				tension: 0.1,
				pointRadius: 0,
				yAxisID: 'y',
				order: 2,
				fill: true
			},
			{
				label: t('strategy.backtestChart.buyAndHold'),
				backgroundColor: (context: any) => {
					const chart = context.chart
					const { ctx, chartArea } = chart
					if (!chartArea) return 'rgba(148, 163, 184, 0.2)'
					return createGradient(ctx, chartArea, 'rgba(148, 163, 184, 0.25)', 'rgba(148, 163, 184, 0)')
				},
				borderColor: '#94a3b8',
				borderWidth: 1.5,
				data: props.result.charts.benchmarkEquity,
				tension: 0.1,
				pointRadius: 0,
				yAxisID: 'y',
				order: 4,
				fill: true
			},
			{
				label: t('strategy.backtestChart.weeklyDCA'),
				backgroundColor: (context: any) => {
					const chart = context.chart
					const { ctx, chartArea } = chart
					if (!chartArea) return 'rgba(139, 92, 246, 0.2)'
					return createGradient(ctx, chartArea, 'rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0)')
				},
				borderColor: '#8b5cf6',
				borderWidth: 1.5,
				data: props.result.charts.dcaEquity || [],
				tension: 0.1,
				pointRadius: 0,
				yAxisID: 'y',
				order: 3,
				fill: true
			},
			{
				label: t('strategy.backtestChart.etfPrice'),
				backgroundColor: '#f59e0b',
				borderColor: '#f59e0b',
				borderWidth: 1.0,
				data: props.result.charts.underlyingPrice || [],
				tension: 0.1,
				pointRadius: 0,
				yAxisID: 'y1',
				order: 4
			},
			{
				label: 'VIX',
				backgroundColor: '#ef4444',
				borderColor: '#ef4444',
				borderWidth: 1.0,
				borderDash: [5, 5],
				data: props.result.charts.vixData || [],
				tension: 0.1,
				pointRadius: 0,
				yAxisID: 'y2',
				order: 5,
				hidden: false // Always show VIX as an important market sentiment reference
			},
			{
				label: t('strategy.backtestChart.tnx'),
				backgroundColor: '#0ea5e9',
				borderColor: '#0ea5e9',
				borderWidth: 1.0,
				borderDash: [3, 3],
				data: props.result.charts.tnxData || [],
				tension: 0.1,
				pointRadius: 0,
				yAxisID: 'y3',
				order: 6,
				hidden: false // US 10-Year Treasury Yield as reference
			},
			{
				label: t('strategy.backtestChart.buy'),
				data: buyPoints,
				backgroundColor: '#16a34a',
				borderColor: '#16a34a',
				pointStyle: 'triangle',
				pointRadius: 4,
				pointHoverRadius: 6,
				showLine: false,
				yAxisID: 'y',
				order: 1
			},
			{
				label: t('strategy.backtestChart.sell'),
				data: sellPoints,
				backgroundColor: '#dc2626',
				borderColor: '#dc2626',
				pointStyle: 'triangle',
				rotation: 180,
				pointRadius: 4,
				pointHoverRadius: 6,
				showLine: false,
				yAxisID: 'y',
				order: 1
			}
		]
	}
})

// 生成 annotation 配置
const drawdownAnnotations = computed(() => {
	if (!props.selectedDrawdown) return {}

	const dd = props.selectedDrawdown
	const dates = props.result.charts.dates || []

	// 找到日期索引（用于x轴定位）
	const peakIdx = dates.findIndex(d => d === dd.peakDate.split('T')[0])
	const valleyIdx = dates.findIndex(d => d === dd.valleyDate.split('T')[0])
	const recoveryIdx = dd.recoveryDate ? dates.findIndex(d => d === dd.recoveryDate!.split('T')[0]) : -1

	const annotations: Record<string, any> = {}

	// 回撤区域 (峰值到谷底) - 红色半透明区域
	if (peakIdx >= 0 && valleyIdx >= 0) {
		annotations.drawdownBox = {
			type: 'box',
			xMin: dates[peakIdx],
			xMax: dates[valleyIdx],
			backgroundColor: 'rgba(239, 68, 68, 0.15)',
			borderColor: 'rgba(239, 68, 68, 0.5)',
			borderWidth: 1,
			borderDash: [4, 4],
		}
	}

	// 恢复区域 (谷底到恢复) - 绿色半透明区域
	if (valleyIdx >= 0 && recoveryIdx >= 0) {
		annotations.recoveryBox = {
			type: 'box',
			xMin: dates[valleyIdx],
			xMax: dates[recoveryIdx],
			backgroundColor: 'rgba(34, 197, 94, 0.1)',
			borderColor: 'rgba(34, 197, 94, 0.4)',
			borderWidth: 1,
			borderDash: [4, 4],
		}
	}

	// 峰值标记线
	if (peakIdx >= 0) {
		annotations.peakLine = {
			type: 'line',
			xMin: dates[peakIdx],
			xMax: dates[peakIdx],
			borderColor: '#16a34a',
			borderWidth: 2,
			borderDash: [6, 3],
			label: {
				display: true,
				content: `📈 $${dd.peakPrice.toFixed(0)}`,
				position: 'start',
				backgroundColor: 'rgba(22, 163, 74, 0.9)',
				color: '#fff',
				font: { size: 11, weight: 'bold' },
				padding: 4,
				borderRadius: 4,
			}
		}
	}

	// 谷底标记线
	if (valleyIdx >= 0) {
		annotations.valleyLine = {
			type: 'line',
			xMin: dates[valleyIdx],
			xMax: dates[valleyIdx],
			borderColor: '#dc2626',
			borderWidth: 2,
			borderDash: [6, 3],
			label: {
				display: true,
				content: `📉 ${dd.depthPercent.toFixed(1)}%`,
				position: 'center',
				backgroundColor: 'rgba(220, 38, 38, 0.9)',
				color: '#fff',
				font: { size: 11, weight: 'bold' },
				padding: 4,
				borderRadius: 4,
			}
		}
	}

	// 恢复标记线
	if (recoveryIdx >= 0) {
		annotations.recoveryLine = {
			type: 'line',
			xMin: dates[recoveryIdx],
			xMax: dates[recoveryIdx],
			borderColor: '#0ea5e9',
			borderWidth: 2,
			borderDash: [6, 3],
			label: {
				display: true,
				content: t('resultsReportDialog.drawdownAnalysis.recoveryBadge', { days: dd.daysToRecover }),
				position: 'end',
				backgroundColor: 'rgba(14, 165, 233, 0.9)',
				color: '#fff',
				font: { size: 11, weight: 'bold' },
				padding: 4,
				borderRadius: 4,
			}
		}
	}

	return annotations
})

// Polymarket 预测市场注解
const polymarketAnnotations = computed(() => {
	if (!props.selectedMarket) return {}

	const market = props.selectedMarket
	const dates = props.result.charts.dates || []
	if (!dates.length) return {}

	const chartStart = dates[0]
	const chartEnd = dates[dates.length - 1]
	if (!chartStart || !chartEnd) return {}

	// 标准化日期格式 (去掉时间部分)
	const normalizeDate = (d: string): string => d.split('T')[0] || d
	const marketStart = normalizeDate(market.startDate)
	const marketEnd = normalizeDate(market.endDate)

	// 找到最接近的日期索引（必须使用图表中实际存在的日期）
	const findClosestDateIdx = (targetDate: string, preferAfter: boolean): number => {
		const target = new Date(targetDate).getTime()
		let closestIdx = -1
		let closestDiff = Infinity

		for (let i = 0; i < dates.length; i++) {
			const dateStr = dates[i]
			if (!dateStr) continue
			const dateTime = new Date(dateStr).getTime()
			const diff = preferAfter ? (dateTime - target) : (target - dateTime)

			// 如果是找开始日期，优先找 >= targetDate 的最近日期
			// 如果是找结束日期，优先找 <= targetDate 的最近日期
			if (preferAfter && dateTime >= target && diff < closestDiff) {
				closestDiff = diff
				closestIdx = i
			} else if (!preferAfter && dateTime <= target && Math.abs(diff) < closestDiff) {
				closestDiff = Math.abs(diff)
				closestIdx = i
			}
		}

		// 如果没找到，退而求其次找最近的
		if (closestIdx === -1) {
			for (let i = 0; i < dates.length; i++) {
				const dateStr = dates[i]
				if (!dateStr) continue
				const diff = Math.abs(new Date(dateStr).getTime() - target)
				if (diff < closestDiff) {
					closestDiff = diff
					closestIdx = i
				}
			}
		}

		return closestIdx
	}

	// 使用图表中实际存在的日期
	const startIdx = findClosestDateIdx(marketStart, true)  // 找 >= 的最近日期
	const endIdx = findClosestDateIdx(marketEnd, false)     // 找 <= 的最近日期

	// 如果找不到有效索引，返回空
	if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return {}

	const xMinDate = dates[startIdx]!
	const xMaxDate = dates[endIdx]!

	const annotations: Record<string, any> = {}

	// 背景颜色根据状态
	const bgColor = market.closed
		? (market.winner === 'Yes' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)')
		: 'rgba(168, 85, 247, 0.12)' // 紫色表示进行中

	const borderColor = market.closed
		? (market.winner === 'Yes' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)')
		: 'rgba(168, 85, 247, 0.6)'

	// 预测市场区域
	annotations.marketBox = {
		type: 'box',
		xMin: xMinDate,
		xMax: xMaxDate,
		backgroundColor: bgColor,
		borderColor: borderColor,
		borderWidth: 2,
		borderDash: market.closed ? [] : [6, 4], // 进行中用虚线
	}

	// 开始标记线 (只在图表范围内显示)
	if (startIdx > 0) {  // 不在最左边时才显示开始线
		annotations.marketStartLine = {
			type: 'line',
			xMin: xMinDate,
			xMax: xMinDate,
			borderColor: '#a855f7',
			borderWidth: 2,
			borderDash: [4, 4],
			label: {
				display: true,
				content: '🎰 ' + t('polymarket.start'),
				position: 'start',
				backgroundColor: 'rgba(168, 85, 247, 0.9)',
				color: '#fff',
				font: { size: 10, weight: 'bold' },
				padding: 3,
				borderRadius: 4,
			}
		}
	}

	// 结束标记线 (只在图表范围内显示)
	if (endIdx < dates.length - 1) {  // 不在最右边时才显示结束线
		const endLabel = market.closed
			? (market.winner === 'Yes' ? '✅ Yes' : '❌ No')
			: '⏳ ' + t('polymarket.pending')

		const endBgColor = market.closed
			? (market.winner === 'Yes' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)')
			: 'rgba(234, 179, 8, 0.9)'

		annotations.marketEndLine = {
			type: 'line',
			xMin: xMaxDate,
			xMax: xMaxDate,
			borderColor: market.closed ? (market.winner === 'Yes' ? '#22c55e' : '#ef4444') : '#eab308',
			borderWidth: 2,
			borderDash: market.closed ? [] : [4, 4],
			label: {
				display: true,
				content: endLabel,
				position: 'end',
				backgroundColor: endBgColor,
				color: '#fff',
				font: { size: 10, weight: 'bold' },
				padding: 3,
				borderRadius: 4,
			}
		}
	}

	return annotations
})

// 合并所有注解（回撤 + 预测市场可同时显示）
const allAnnotations = computed(() => ({
	...drawdownAnnotations.value,
	...polymarketAnnotations.value
}))

const chartOptions = computed(() => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: {
		mode: 'index' as const,
		intersect: false,
	},
	plugins: {
		legend: {
			position: 'top' as const,
			labels: {
				usePointStyle: true,
				pointStyleWidth: 10,
				// 自定义图例样式
				generateLabels: (chart: any) => {
					const datasets = chart.data.datasets
					return datasets.map((dataset: any, i: number) => {
						const meta = chart.getDatasetMeta(i)
						// 买入/卖出使用三角形，其他使用正方形
						let pointStyle: string = 'rect'
						if (dataset.pointStyle === 'triangle') {
							pointStyle = 'triangle'
						}
						return {
							text: dataset.label,
							fillStyle: typeof dataset.backgroundColor === 'function'
								? dataset.borderColor
								: dataset.backgroundColor,
							strokeStyle: dataset.borderColor,
							lineWidth: dataset.borderWidth || 1,
							hidden: meta.hidden,
							index: i,
							pointStyle: pointStyle,
							rotation: dataset.rotation || 0,
							lineDash: dataset.borderDash || [],
						}
					})
				}
			}
		},
		annotation: {
			annotations: allAnnotations.value
		},
		tooltip: {
			callbacks: {
				label: function (context: any) {
					const label = context.dataset.label || '';
					const raw = context.raw;

					if (label === t('strategy.backtestChart.buy') || label === t('strategy.backtestChart.sell')) {
						const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(raw.amount);
						const qty = raw.quantity.toFixed(2);
						return `${label}: ${amount} (${qty} ${t('strategy.backtestChart.shares')} ${t('strategy.backtestChart.atPrice')}${raw.price?.toFixed(2) ?? '—'})`;
					}

					let valueLabel = label;
					if (valueLabel) {
						valueLabel += ': ';
					}
					if (context.parsed.y !== null) {
						if (label === 'VIX') { // Special handling for VIX
							valueLabel += context.parsed.y.toFixed(2); // VIX does not have a currency symbol
						} else if (label === t('strategy.backtestChart.tnx')) { // Special handling for TNX
							valueLabel += (context.parsed.y / 10).toFixed(2) + '%'; // TNX: 42.50 means 4.25%
						} else {
							valueLabel += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
						}
					}
					return valueLabel;
				},
				afterBody: function (context: any) {
					const point = context[0];
					if ((point.dataset.label === t('strategy.backtestChart.buy') || point.dataset.label === t('strategy.backtestChart.sell')) && point.raw.reason) {
						return `${t('strategy.backtestChart.reason')}: ${point.raw.reason}`;
					}
					return '';
				}
			}
		}
	},
	scales: {
		y: {
			type: 'linear' as const,
			display: true,
			position: 'left' as const,
			title: {
				display: true,
				text: t('strategy.backtestChart.accountNetValue') + ' ($)'
			},
			ticks: {
				callback: function (value: any) {
					return '$' + value;
				}
			}
		},
		y1: {
			type: 'linear' as const,
			display: true,
			position: 'right' as const,
			title: {
				display: true,
				text: t('strategy.backtestChart.etfPrice') + ' ($)'
			},
			grid: {
				drawOnChartArea: false,
			},
			ticks: {
				callback: function (value: any) {
					return '$' + value;
				}
			}
		},
		y2: {
			type: 'linear' as const,
			display: true,
			position: 'right' as const,
			title: {
				display: true,
				text: 'VIX'
			},
			grid: {
				drawOnChartArea: false,
			},
			ticks: {
				color: '#ef4444'
			}
		},
		y3: {
			type: 'linear' as const,
			display: true,
			position: 'right' as const,
			title: {
				display: true,
				text: t('strategy.backtestChart.tnx') + ' (%)'
			},
			grid: {
				drawOnChartArea: false,
			},
			ticks: {
				color: '#0ea5e9',
				callback: function (value: any) {
					// TNX value like 42.50 means 4.25%
					return (value / 10).toFixed(2) + '%';
				}
			}
		}
	}
}))
</script>

<template>
	<div
		class="flex-1 min-h-[300px] w-full bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/40 shadow-lg shadow-emerald-500/10 relative">
		<Line :data="chartData" :options="chartOptions" />
	</div>
</template>
