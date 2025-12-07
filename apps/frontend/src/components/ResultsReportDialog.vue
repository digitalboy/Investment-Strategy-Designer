<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, onMounted, watch, ref } from 'vue'
import { useStrategyStore } from '@/stores/strategy'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-vue-next'
import PerformanceMetricCard from './reports/PerformanceMetricCard.vue'
import BacktestChart from './reports/BacktestChart.vue'
import DrawdownAnalysisCard from './reports/DrawdownAnalysisCard.vue'
import PolymarketPanel from './reports/PolymarketPanel.vue'
import type { DrawdownEvent } from '@/types'
import type { ChartAnnotationMarket } from '@/services/polymarketService'

const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits(['update:open'])

// 选中的回撤事件，用于图表高亮显示
const selectedDrawdown = ref<DrawdownEvent | null>(null)

// 选中的预测市场，用于图表高亮显示
const selectedMarket = ref<ChartAnnotationMarket | null>(null)

// 周定投的加速比例状态
const dcaAcceleration = ref(0.12) // Default 12% as a decimal

onMounted(() => {
	console.log('ResultsReportDialog mounted')
	// Initialize dcaAcceleration from the backtest result if available
	if (result.value?.performance.dca?.dcaAccelerationRate !== undefined) {
		dcaAcceleration.value = result.value.performance.dca.dcaAccelerationRate;
	}
})

watch(() => props.open, (isOpen) => {
	console.log('ResultsReportDialog open changed:', isOpen)
	// 对话框关闭时清除选中状态
	if (!isOpen) {
		selectedDrawdown.value = null
		selectedMarket.value = null
	}
	// 当对话框打开时，初始化 dcaAcceleration
	if (isOpen && result.value?.performance.dca?.dcaAccelerationRate !== undefined) {
		dcaAcceleration.value = result.value.performance.dca.dcaAccelerationRate;
	}
})

// 当 dcaAcceleration 改变时，重新运行回测
watch(dcaAcceleration, (newValue, oldValue) => {
	if (newValue !== oldValue) {
		console.log('DCA Acceleration changed to', newValue, 're-running backtest...');
		// 只有当有回测结果时才重新运行，避免首次打开就触发
		if (store.backtestResult) {
			store.runBacktest(newValue);
		}
	}
});

const store = useStrategyStore()
const result = computed(() => store.backtestResult)
const resultTitle = computed(() => store.currentStrategyName || store.currentStrategyMetadata?.name || '策略')
const currentSymbol = computed(() => result.value?.metadata?.symbol || store.config.etfSymbol || '标的')
const strategyTriggerCount = computed(() => store.config.triggers?.length || 0)

// Polymarket 需要的日期范围
const chartDateRange = computed(() => {
	const dates = result.value?.charts?.dates
	if (!dates || dates.length === 0) return undefined
	const first = dates[0]
	const last = dates[dates.length - 1]
	if (!first || !last) return undefined
	return { start: first, end: last }
})

// 存储从 PolymarketPanel 获取的数据
const polymarketData = ref<ChartAnnotationMarket[]>([])

const handlePolymarketDataLoaded = (data: ChartAnnotationMarket[]) => {
	polymarketData.value = data
}

// 按周采样图表数据（每周取最后一个交易日）
const sampleWeeklyData = <T,>(dates: string[], data: T[]): { dates: string[], values: T[] } => {
	const result: { dates: string[], values: T[] } = { dates: [], values: [] }
	if (!dates.length || !data.length) return result

	let lastWeek = -1
	for (let i = 0; i < dates.length; i++) {
		const date = new Date(dates[i]!)
		const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))
		if (week !== lastWeek) {
			// 新的一周，保存上周最后一天的数据
			if (result.dates.length > 0 && i > 0) {
				result.dates[result.dates.length - 1] = dates[i - 1]!
				result.values[result.values.length - 1] = data[i - 1]!
			}
			result.dates.push(dates[i]!)
			result.values.push(data[i]!)
			lastWeek = week
		} else {
			// 同一周，更新为最新数据
			result.dates[result.dates.length - 1] = dates[i]!
			result.values[result.values.length - 1] = data[i]!
		}
	}
	return result
}

// 导出数据为 JSON（用于 AI 分析提示语）
const exportDataForAI = () => {
	if (!result.value) return

	const r = result.value
	const dates = r.charts?.dates || []

	// 按周采样图表数据
	const weeklyStrategy = sampleWeeklyData(dates, r.charts?.strategyEquity || [])
	const weeklyBenchmark = sampleWeeklyData(dates, r.charts?.benchmarkEquity || [])
	const weeklyDca = sampleWeeklyData(dates, r.charts?.dcaEquity || [])
	const weeklyPrice = sampleWeeklyData(dates, r.charts?.underlyingPrice || [])

	const exportData = {
		exportInfo: {
			exportedAt: new Date().toISOString(),
			purpose: 'AI Analysis Prompt - Investment Strategy Backtest Results',
			notice: 'Chart data is sampled weekly to reduce size. Full daily data available in the app.'
		},
		strategy: {
			name: resultTitle.value,
			symbol: currentSymbol.value,
			dateRange: chartDateRange.value,
			triggerCount: strategyTriggerCount.value
		},
		triggers: store.config.triggers || [],
		performance: {
			strategy: r.performance?.strategy || {},
			benchmark: r.performance?.benchmark || {},
			dca: r.performance?.dca || {}
		},
		topDrawdowns: (r.analysis?.topDrawdowns || []).slice(0, 5),
		predictionMarkets: polymarketData.value
			.sort((a, b) => b.volume - a.volume)
			.slice(0, 10)
			.map(m => ({
				title: m.title,
				primaryQuestion: m.primaryQuestion,
				volume: m.volumeFormatted,
				startDate: m.startDate,
				endDate: m.endDate,
				closed: m.closed,
				winner: m.winner,
				outcomes: m.outcomes
			})),
		chartData: {
			sampling: 'weekly',
			dataPoints: weeklyStrategy.dates.length,
			dates: weeklyStrategy.dates,
			strategyEquity: weeklyStrategy.values,
			benchmarkEquity: weeklyBenchmark.values,
			dcaEquity: weeklyDca.values,
			underlyingPrice: weeklyPrice.values
		}
	}

	// 下载 JSON 文件
	const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `strategy-analysis-${currentSymbol.value}-${new Date().toISOString().split('T')[0]}.json`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}
</script>

<template>
	<Dialog :open="open" @update:open="$emit('update:open', $event)">
		<!--
            修改 1: DialogContent - Maximize size
        -->
		<DialogContent
			class="!top-0 !left-0 !translate-x-0 !translate-y-0 w-screen h-screen !max-w-none rounded-none flex flex-col p-0 gap-0 overflow-hidden bg-slate-50/90">

			<!--
                修改 2: DialogHeader
            -->
			<DialogHeader
				class="mx-4 mt-4 mb-2 px-6 py-4 bg-linear-to-r from-lime-600 via-emerald-600 to-lime-600 text-white shrink-0 rounded-2xl shadow-lg shadow-emerald-600/20">
				<DialogTitle class="text-xl font-bold tracking-tight flex items-center gap-2">
					<span>{{ resultTitle }}</span>
					<span class="opacity-60 font-light">|</span>
					<span class="bg-white/20 px-2 py-0.5 rounded text-sm backdrop-blur-sm font-mono">{{ currentSymbol
					}}</span>
				</DialogTitle>
				<DialogDescription class="text-sm mt-1 text-emerald-100 font-medium opacity-90">
					{{ t('resultsReportDialog.description') }}
				</DialogDescription>
			</DialogHeader>

			<!--
                修改 3: 内容区域包裹容器
            -->
			<div
				class="flex-1 mx-4 mb-4 flex flex-col min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

				<!-- 滚动内容区 -->
				<div v-if="result && result.performance && result.performance.strategy"
					class="flex-1 flex flex-col p-4 overflow-y-auto bg-linear-to-br from-slate-50 via-lime-50/10 to-emerald-50/20">

					<!-- KPI Cards (Top Row) -->
					<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 shrink-0">
						<!-- Strategy Card -->
						<PerformanceMetricCard :title="t('resultsReportDialog.strategyCardTitle')"
							:metrics="result.performance.strategy" variant="strategy" :symbol="result.metadata.symbol"
							:triggerCount="strategyTriggerCount" />

						<!-- Benchmark Card: Buy & Hold -->
						<PerformanceMetricCard :title="t('resultsReportDialog.benchmarkCardTitle')"
							:metrics="result.performance.benchmark" variant="benchmark" />

						<!-- Benchmark Card: Weekly DCA -->
						<PerformanceMetricCard v-if="result.performance.dca"
							:title="t('resultsReportDialog.dcaCardTitle')" :metrics="result.performance.dca"
							variant="dca" :dcaAcceleration="dcaAcceleration"
							@update:dcaAcceleration="dcaAcceleration = $event" />
					</div>

					<!-- Charts & Analysis (Split View) -->
					<div class="flex flex-col xl:flex-row gap-4 flex-1 min-h-[500px]">
						<!-- Polymarket Panel (Left Sidebar) -->
						<div class="xl:w-72 2xl:w-80 shrink-0 h-full min-h-[400px] xl:min-h-0 order-2 xl:order-1">
							<PolymarketPanel :dateRange="chartDateRange" :selectedMarket="selectedMarket"
								@select="selectedMarket = $event" @dataLoaded="handlePolymarketDataLoaded"
								class="h-full" />
						</div>

						<!-- Main Chart (Takes remaining space) -->
						<div class="flex-1 min-h-[400px] xl:min-h-0 h-full order-1 xl:order-2">
							<BacktestChart :result="result" :selectedDrawdown="selectedDrawdown"
								:selectedMarket="selectedMarket" class="h-full" />
						</div>

						<!-- Drawdown Analysis (Right Sidebar) -->
						<div class="xl:w-72 2xl:w-80 shrink-0 h-full min-h-[400px] xl:min-h-0 order-3">
							<DrawdownAnalysisCard :drawdowns="result.analysis?.topDrawdowns || []"
								:selectedDrawdown="selectedDrawdown" @select="selectedDrawdown = $event"
								class="h-full" />
						</div>
					</div>
				</div>

				<!-- 空状态 -->
				<div v-else class="flex-1 flex items-center justify-center flex-col gap-2 bg-slate-50">
					<div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
						<svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					</div>
					<p class="text-lg font-medium text-slate-900">{{ t('resultsReportDialog.noData') }}</p>
					<p class="text-sm text-slate-500">{{ t('resultsReportDialog.runBacktest') }}</p>
					<p v-if="result && (!result.performance || !result.performance.strategy)"
						class="text-xs text-red-500 mt-2">
						{{ t('resultsReportDialog.dataError') }}
					</p>
				</div>

				<!-- Footer -->
				<div class="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 z-10">
					<Button @click="exportDataForAI" variant="outline"
						class="border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-4">
						<Download class="w-4 h-4 mr-2" />
						{{ t('resultsReportDialog.downloadData') }}
					</Button>
					<Button @click="$emit('update:open', false)"
						class="bg-linear-to-r from-lime-600 to-emerald-600 hover:from-lime-700 hover:to-emerald-700 text-white shadow-md shadow-lime-500/30 transition-all rounded-lg px-6">
						{{ t('resultsReportDialog.closeReport') }}
					</Button>
				</div>
			</div>

		</DialogContent>
	</Dialog>
</template>

<style scoped>
:deep([data-slot="dialog-close"]) {
	opacity: 0;
}
</style>
