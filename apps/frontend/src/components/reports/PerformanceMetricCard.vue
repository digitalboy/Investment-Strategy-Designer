<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info, ChevronDown } from 'lucide-vue-next'
import type { PerformanceMetrics } from '@/types'

const { t } = useI18n()

const props = defineProps<{
    title: string
    metrics: PerformanceMetrics
    variant: 'strategy' | 'benchmark' | 'dca' | 'scoring'
    symbol?: string
    triggerCount?: number // New prop
    // For DCA Acceleration
    dcaAcceleration?: number // Value from parent (ResultsReportDialog)
}>()

const emit = defineEmits(['update:dcaAcceleration'])

const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '-'
    return num.toFixed(decimals)
}

// DCA acceleration options
const accelerationOptions = [
    { value: '0', label: '0%' },
    { value: '5', label: '5%' },
    { value: '10', label: '10%' },
    { value: '12', label: '12%' },
    { value: '15', label: '15%' },
    { value: '20', label: '20%' },
    { value: '25', label: '25%' },
    { value: '30', label: '30%' },
    { value: '50', label: '50%' },
]

// Internal value for select, synced with prop
const selectedAcceleration = computed({
    get() {
        const rate = props.metrics.dcaAccelerationRate !== undefined
            ? Math.round(props.metrics.dcaAccelerationRate * 100)
            : Math.round((props.dcaAcceleration || 0.12) * 100)
        return String(rate)
    },
    set(value: string) {
        emit('update:dcaAcceleration', Number(value) / 100) // Convert back to decimal for parent
    }
})

// 当前加速率的百分比值
const currentAccelerationPercent = computed(() => {
    return props.metrics.dcaAccelerationRate !== undefined
        ? Math.round(props.metrics.dcaAccelerationRate * 100)
        : Math.round((props.dcaAcceleration || 0.12) * 100)
})

const cardClasses = computed(() => {
    if (props.variant === 'strategy') {
        return 'border-emerald-300/50 bg-linear-to-br from-white via-emerald-50/70 to-lime-100/60 shadow-lg shadow-emerald-500/20'
    }
    if (props.variant === 'dca') {
        return 'border-violet-300/50 bg-linear-to-br from-white via-violet-50/70 to-purple-100/60 shadow-lg shadow-violet-500/20'
    }
    if (props.variant === 'scoring') {
        return 'border-fuchsia-300/50 bg-linear-to-br from-white via-fuchsia-50/70 to-pink-100/60 shadow-lg shadow-fuchsia-500/20'
    }
    return 'border-slate-300/50 bg-linear-to-br from-white via-slate-50/70 to-gray-100/50 shadow-lg shadow-slate-500/10'
})

const headerBorderClass = computed(() => {
    if (props.variant === 'strategy') return 'border-emerald-200/60'
    if (props.variant === 'dca') return 'border-violet-200/60'
    if (props.variant === 'scoring') return 'border-fuchsia-200/60'
    return 'border-slate-200/60'
})

const titleClass = computed(() => {
    if (props.variant === 'strategy') return 'text-emerald-700'
    if (props.variant === 'dca') return 'text-violet-700'
    if (props.variant === 'scoring') return 'text-fuchsia-700'
    return 'text-slate-700'
})

const statsBgClass = computed(() => {
    if (props.variant === 'strategy') return 'bg-emerald-50/30'
    if (props.variant === 'dca') return 'bg-violet-50/30'
    if (props.variant === 'scoring') return 'bg-fuchsia-50/30'
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
            <p v-if="variant === 'benchmark'" class="text-xs text-slate-500 mt-0">
                {{ t('performanceMetrics.benchmarkDescription') }}
            </p>
            <p v-else-if="variant === 'dca'" class="text-xs text-slate-500 mt-0 flex items-center gap-1">
                <span>{{ t('performanceMetrics.dcaDescription') }}</span>
                <span v-if="metrics.dcaAccelerationRate !== undefined"
                    class="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold whitespace-nowrap">
                    +{{ (metrics.dcaAccelerationRate * 100).toFixed(0) }}% {{ t('performanceMetrics.acceleration') }}
                </span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Info class="w-3.5 h-3.5 text-violet-400 hover:text-violet-600 cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" class="max-w-xs text-xs">
                            {{ t('performanceMetrics.dcaTooltip', { rate: currentAccelerationPercent }) }}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </p>
            <p v-else-if="variant === 'scoring'" class="text-xs text-slate-500 mt-0">
                {{ t('performanceMetrics.scoringDescription') }}
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
                <template v-if="variant === 'strategy' || variant === 'scoring'">
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
                    <div>
                        <span class="text-slate-500 block">{{ t('performanceMetrics.accelerationRate') }}</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                                <span
                                    class="font-medium text-violet-600 hover:text-violet-800 cursor-pointer inline-flex items-center">
                                    {{ selectedAcceleration }}%
                                    <ChevronDown class="w-3 h-3 ml-0.5" />
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" class="min-w-16">
                                <DropdownMenuItem v-for="opt in accelerationOptions" :key="opt.value"
                                    class="text-xs cursor-pointer" @click="selectedAcceleration = opt.value">
                                    {{ opt.label }}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
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
