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
        <DialogContent class="sm:max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
            <DialogHeader
                class="px-6 py-4 bg-linear-to-r from-indigo-600 via-blue-600 to-violet-600 text-white shrink-0">
                <DialogTitle class="text-lg font-bold">
                    {{ resultTitle }} · {{ currentSymbol }} · {{ t('resultsReportDialog.title') }}
                </DialogTitle>
                <DialogDescription class="text-xs mt-1 text-indigo-100">
                    {{ t('resultsReportDialog.description') }}
                </DialogDescription>
            </DialogHeader>

            <div v-if="result && result.performance && result.performance.strategy"
                class="flex-1 flex flex-col p-4 min-h-0 overflow-y-auto bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3 shrink-0">
                    <!-- Strategy Card -->
                    <PerformanceMetricCard :title="t('resultsReportDialog.strategyCardTitle')"
                        :metrics="result.performance.strategy" variant="strategy" :symbol="result.metadata.symbol" />

                    <!-- Benchmark Card -->
                    <PerformanceMetricCard :title="t('resultsReportDialog.benchmarkCardTitle')"
                        :metrics="result.performance.benchmark" variant="benchmark" />
                </div>

                <!-- Chart -->
                <BacktestChart :result="result" />
            </div>
            <div v-else
                class="flex-1 flex items-center justify-center flex-col gap-2 bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
                <p class="text-lg font-medium text-slate-900">{{ t('resultsReportDialog.noData') }}</p>
                <p class="text-sm text-slate-500">{{ t('resultsReportDialog.runBacktest') }}</p>
                <p v-if="result && (!result.performance || !result.performance.strategy)"
                    class="text-xs text-red-500 mt-2">
                    {{ t('resultsReportDialog.dataError') }}
                </p>
            </div>

            <div class="p-4 border-t border-indigo-200/30 bg-white/90 backdrop-blur-md flex justify-end shrink-0">
                <Button @click="$emit('update:open', false)"
                    class="bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md shadow-indigo-500/30 transition-all">{{
                        t('resultsReportDialog.closeReport') }}</Button>
            </div>
        </DialogContent>
    </Dialog>
</template>
