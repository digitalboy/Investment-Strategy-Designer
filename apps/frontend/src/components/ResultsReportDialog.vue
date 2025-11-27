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
import PerformanceMetricCard from './reports/PerformanceMetricCard.vue'
import BacktestChart from './reports/BacktestChart.vue'
import DrawdownAnalysisCard from './reports/DrawdownAnalysisCard.vue'
import type { DrawdownEvent } from '@/types'

const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits(['update:open'])

// 选中的回撤事件，用于图表高亮显示
const selectedDrawdown = ref<DrawdownEvent | null>(null)

onMounted(() => {
	console.log('ResultsReportDialog mounted')
})

watch(() => props.open, (isOpen) => {
	console.log('ResultsReportDialog open changed:', isOpen)
	// 对话框关闭时清除选中状态
	if (!isOpen) {
		selectedDrawdown.value = null
	}
})

const store = useStrategyStore()
const result = computed(() => store.backtestResult)
const resultTitle = computed(() => store.currentStrategyName || store.currentStrategyMetadata?.name || '策略')
const currentSymbol = computed(() => result.value?.metadata?.symbol || store.config.etfSymbol || '标的')
const strategyTriggerCount = computed(() => store.config.triggers?.length || 0)
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
							variant="dca" />
					</div>

					<!-- Charts & Analysis (Split View) -->
					<div class="flex flex-col xl:flex-row gap-4 flex-1 min-h-[500px]">
						<!-- Main Chart (Takes remaining space) -->
						<div class="flex-1 min-h-[400px] xl:min-h-0 h-full">
							<BacktestChart :result="result" :selectedDrawdown="selectedDrawdown" class="h-full" />
						</div>

						<!-- Drawdown Analysis (Sidebar) -->
						<div class="xl:w-80 2xl:w-96 shrink-0 h-full min-h-[400px] xl:min-h-0">
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
				<div class="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0 z-10">
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
