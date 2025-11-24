<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, onMounted, watch } from 'vue'
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

const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits(['update:open'])

onMounted(() => {
    console.log('ResultsReportDialog mounted')
})

watch(() => props.open, (isOpen) => {
    console.log('ResultsReportDialog open changed:', isOpen)
})

const store = useStrategyStore()
const result = computed(() => store.backtestResult)
const resultTitle = computed(() => store.currentStrategyName || store.currentStrategyMetadata?.name || '策略')
const currentSymbol = computed(() => result.value?.metadata?.symbol || store.config.etfSymbol || '标的')
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <!-- 
            修改 1: DialogContent 
            - 增加 bg-slate-50/80 作为底色，让卡片的轮廓更明显。
            - 保持 gap-0，我们通过 margin 来控制间距。
        -->
        <DialogContent class="sm:max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50/80">

            <!-- 
                修改 2: DialogHeader (渐变区域)
                - mx-4 mt-4: 增加左右和顶部边距。
                - rounded-2xl: 增加圆角，不再是直角。
                - shadow-lg: 增加投影，提升层次感。
                - mb-3: 让 Header 和下方的内容之间有一点空隙，更有层次。
            -->
            <DialogHeader
                class="mx-4 mt-4 mb-2 px-6 py-5 bg-linear-to-r from-lime-600 via-emerald-600 to-lime-600 text-white shrink-0 rounded-2xl shadow-lg shadow-emerald-600/20">
                <DialogTitle class="text-xl font-bold tracking-tight flex items-center gap-2">
                    <span>{{ resultTitle }}</span>
                    <span class="opacity-60 font-light">|</span>
                    <span class="bg-white/20 px-2 py-0.5 rounded text-sm backdrop-blur-sm">{{ currentSymbol }}</span>
                </DialogTitle>
                <DialogDescription class="text-sm mt-1 text-emerald-50 font-medium">
                    {{ t('resultsReportDialog.description') }}
                </DialogDescription>
            </DialogHeader>

            <!-- 
                修改 3: 内容区域包裹容器 
                - 这是一个新加的 div，用来包裹 ScrollView 和 Footer。
                - flex-1 mx-4 mb-4: 填满剩余空间，并保持左右和底部的边距。
                - rounded-2xl: 下半部分也做成圆角卡片。
                - overflow-hidden: 确保圆角内的滚动条不溢出。
                - border: 加一个极淡的边框，增强精致感。
            -->
            <div
                class="flex-1 mx-4 mb-4 flex flex-col min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                <!-- 滚动内容区 -->
                <div v-if="result && result.performance && result.performance.strategy"
                    class="flex-1 flex flex-col p-4 overflow-y-auto bg-linear-to-br from-slate-50 via-lime-50/10 to-emerald-50/20">
                    <!-- KPI Cards -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 shrink-0">
                        <!-- Strategy Card -->
                        <PerformanceMetricCard :title="t('resultsReportDialog.strategyCardTitle')"
                            :metrics="result.performance.strategy" variant="strategy"
                            :symbol="result.metadata.symbol" />

                        <!-- Benchmark Card -->
                        <PerformanceMetricCard :title="t('resultsReportDialog.benchmarkCardTitle')"
                            :metrics="result.performance.benchmark" variant="benchmark" />
                    </div>

                    <!-- Chart -->
                    <BacktestChart :result="result" />
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

                <!-- Footer (现在包含在圆角容器内) -->
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