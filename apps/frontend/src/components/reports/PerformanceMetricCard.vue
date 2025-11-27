<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PerformanceMetrics } from '@/types'

const { t } = useI18n()

const props = defineProps<{
    title: string
    metrics: PerformanceMetrics
    variant: 'strategy' | 'benchmark' | 'dca'
    symbol?: string
    triggerCount?: number // New prop
}>()

const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '-'
    return num.toFixed(decimals)
}

const cardClasses = computed(() => {
    if (props.variant === 'strategy') {
        return 'border-emerald-300/50 bg-linear-to-br from-white via-emerald-50/70 to-lime-100/60 shadow-lg shadow-emerald-500/20'
    }
    if (props.variant === 'dca') {
        return 'border-violet-300/50 bg-linear-to-br from-white via-violet-50/70 to-purple-100/60 shadow-lg shadow-violet-500/20'
    }
    return 'border-slate-300/50 bg-linear-to-br from-white via-slate-50/70 to-gray-100/50 shadow-lg shadow-slate-500/10'
})

const headerBorderClass = computed(() => {
    if (props.variant === 'strategy') return 'border-emerald-200/60'
    if (props.variant === 'dca') return 'border-violet-200/60'
    return 'border-slate-200/60'
})

const titleClass = computed(() => {
    if (props.variant === 'strategy') return 'text-emerald-700'
    if (props.variant === 'dca') return 'text-violet-700'
    return 'text-slate-700'
})

const statsBgClass = computed(() => {
    if (props.variant === 'strategy') return 'bg-emerald-50/30'
    if (props.variant === 'dca') return 'bg-violet-50/30'
    return 'bg-slate-50/40'
})
</script>

<template>
    <Card :class="[cardClasses, 'py-1 px-1 gap-0']">
        <CardHeader :class="['px-3 pt-2 pb-0 mb-0 border-b', headerBorderClass]">
            <CardTitle :class="['text-sm font-semibold flex items-center justify-between', titleClass]">
                <span>{{ title }}</span>
                <span v-if="symbol"
                    class="text-[10px] font-normal text-white bg-linear-to-r from-lime-600 to-emerald-600 px-2 py-0.5 rounded-full shadow-md">
                    {{ symbol }}
                </span>
            </CardTitle>
            <p v-if="variant === 'benchmark' || variant === 'dca'" class="text-xs text-slate-500 mt-0">
                {{ variant === 'dca' ? t('performanceMetrics.dcaDescription') :
                    t('performanceMetrics.benchmarkDescription') }}
            </p>
            <p v-else-if="variant === 'strategy' && triggerCount !== undefined" class="text-xs text-slate-500 mt-0">
                {{ triggerCount }} {{ t('strategy.header.triggers') }}
            </p>
        </CardHeader>
        <CardContent class="p-3">
            <!-- Metrics Row -->
            <div class="grid grid-cols-4 gap-2 mb-2">
                <div>
                    <p class="text-[10px] text-slate-500 mb-0.5">{{ t('performanceMetrics.totalReturn') }}</p>
                    <p class="text-base font-bold text-slate-900">{{ formatNumber(metrics.totalReturn) }}%</p>
                </div>
                <div>
                    <p class="text-[10px] text-slate-500 mb-0.5">{{ t('performanceMetrics.annualizedReturn') }}</p>
                    <p class="text-base font-bold text-slate-900">{{ formatNumber(metrics.annualizedReturn) }}%</p>
                </div>
                <div>
                    <p class="text-[10px] text-slate-500 mb-0.5">{{ t('performanceMetrics.maxDrawdown') }}</p>
                    <p class="text-base font-bold text-red-600">{{ formatNumber(metrics.maxDrawdown) }}%</p>
                </div>
                <div>
                    <p class="text-[10px] text-slate-500 mb-0.5">{{ t('performanceMetrics.sharpeRatio') }}</p>
                    <p class="text-base font-bold text-slate-900">{{ formatNumber(metrics.sharpeRatio) }}</p>
                </div>
            </div>

            <!-- Stats Row -->
            <div
                :class="['grid grid-cols-4 gap-2 text-[10px] pt-2 border-t border-emerald-200/60 -mx-3 px-3 -mb-3 pb-3 rounded-b-lg', statsBgClass]">
                <template v-if="variant === 'strategy'">
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.totalTrades') }}</span>
                        <span class="font-medium text-slate-900">{{ metrics.tradeStats.totalTrades }}</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.buySell') }}</span>
                        <span class="font-medium">
                            <span class="text-green-600">{{ metrics.tradeStats.buyCount }}</span> /
                            <span class="text-red-600">{{ metrics.tradeStats.sellCount }}</span>
                        </span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.totalInvested') }}</span>
                        <span class="font-medium text-slate-900">${{ formatNumber(metrics.tradeStats.totalInvested, 0)
                            }}</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.totalProceeds') }}</span>
                        <span class="font-medium text-slate-900">${{ formatNumber(metrics.tradeStats.totalProceeds, 0)
                            }}</span>
                    </div>
                </template>
                <template v-else-if="variant === 'dca'">
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.totalTrades') }}</span>
                        <span class="font-medium text-slate-900">{{ metrics.tradeStats?.totalTrades ?? '-' }}</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.weeklyAmount') }}</span>
                        <span class="font-medium text-violet-600">${{
                            metrics.tradeStats?.buyCount && metrics.tradeStats?.totalInvested
                                ? formatNumber(metrics.tradeStats.totalInvested / metrics.tradeStats.buyCount, 2)
                                : '-'
                        }}</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.totalInvested') }}</span>
                        <span class="font-medium text-slate-900">${{ formatNumber(metrics.tradeStats?.totalInvested, 0)
                            }}</span>
                    </div>
                    <div></div>
                </template>
                <template v-else>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.totalTrades') }}</span>
                        <span class="font-medium text-slate-900">1</span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.buySell') }}</span>
                        <span class="font-medium">
                            <span class="text-green-600">1</span> /
                            <span class="text-slate-400">0</span>
                        </span>
                    </div>
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.totalInvested') }}</span>
                        <span class="font-medium text-slate-900">${{ formatNumber(metrics.tradeStats?.totalInvested, 0)
                            }}</span>
                    </div>
                    <div></div>
                </template>
            </div>
        </CardContent>
    </Card>
</template>
