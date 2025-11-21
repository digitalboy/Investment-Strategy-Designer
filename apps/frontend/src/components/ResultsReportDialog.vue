<script setup lang="ts">
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)

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

const chartData = computed(() => {
    console.log('Computing chart data. Result:', result.value)
    if (!result.value) return { labels: [], datasets: [] }

    // 处理交易点数据
    const trades = result.value.trades || [];
    const dates = result.value.charts.dates || []
    const strategyEquity = result.value.charts.strategyEquity || []

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
        labels: result.value.charts.dates,
        datasets: [
            {
                label: '我的策略',
                backgroundColor: '#4f46e5',
                borderColor: '#4f46e5',
                borderWidth: 1.0,
                data: result.value.charts.strategyEquity,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y',
                order: 2
            },
            {
                label: '买入并持有',
                backgroundColor: '#94a3b8',
                borderColor: '#94a3b8',
                borderWidth: 1.5,
                data: result.value.charts.benchmarkEquity,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y',
                order: 3
            },
            {
                label: 'ETF 价格',
                backgroundColor: '#f59e0b',
                borderColor: '#f59e0b',
                borderWidth: 1.0,
                data: result.value.charts.underlyingPrice || [],
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y1',
                hidden: true, // 默认隐藏，避免视觉混乱
                order: 4
            },
            {
                label: '买入',
                data: buyPoints,
                backgroundColor: '#16a34a', // green-600
                borderColor: '#16a34a',
                pointStyle: 'triangle',
                pointRadius: 4,
                pointHoverRadius: 6,
                showLine: false,
                yAxisID: 'y',
                order: 1
            },
            {
                label: '卖出',
                data: sellPoints,
                backgroundColor: '#dc2626', // red-600
                borderColor: '#dc2626',
                pointStyle: 'triangle',
                rotation: 180, // 倒三角
                pointRadius: 4,
                pointHoverRadius: 6,
                showLine: false,
                yAxisID: 'y',
                order: 1
            }
        ]
    }
})

const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '-'
    return num.toFixed(decimals)
}

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index' as const,
        intersect: false,
    },
    plugins: {
        legend: {
            position: 'top' as const,
        },
        tooltip: {
            callbacks: {
                label: function (context: any) {
                    const label = context.dataset.label || '';
                    const raw = context.raw;

                    // 自定义买卖点的 Tooltip
                    if (label === '买入' || label === '卖出') {
                        const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(raw.amount);
                        const qty = raw.quantity.toFixed(2);
                        return `${label}: ${amount} (${qty} 份额 @ $${raw.price?.toFixed(2) ?? '—'})`;
                    }

                    // 默认 Tooltip
                    let valueLabel = label;
                    if (valueLabel) {
                        valueLabel += ': ';
                    }
                    if (context.parsed.y !== null) {
                        valueLabel += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                    }
                    return valueLabel;
                },
                afterBody: function (context: any) {
                    // 如果是买卖点，显示交易原因
                    const point = context[0];
                    if ((point.dataset.label === '买入' || point.dataset.label === '卖出') && point.raw.reason) {
                        return `原因: ${point.raw.reason}`;
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
                text: '账户净值 ($)'
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
                text: 'ETF 价格 ($)'
            },
            grid: {
                drawOnChartArea: false, // 避免网格线重叠
            },
            ticks: {
                callback: function (value: any) {
                    return '$' + value;
                }
            }
        }
    }
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
            <DialogHeader class="px-4 py-3 border-b shrink-0">
                <DialogTitle>
                    {{ resultTitle }} · {{ currentSymbol }} · 回测报告
                </DialogTitle>
                <DialogDescription class="text-xs mt-1">
                    查看策略的历史回测表现、收益率对比及详细交易数据。
                </DialogDescription>
            </DialogHeader>

            <div v-if="result && result.performance && result.performance.strategy"
                class="flex-1 flex flex-col p-3 min-h-0 overflow-y-auto">
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3 shrink-0">
                    <!-- Strategy Card -->
                    <Card class="border-indigo-200 bg-indigo-50/50 shadow-sm py-1 px-1 gap-0">
                        <CardHeader class="px-3 pt-2 pb-0 border-b border-indigo-100">
                            <CardTitle class="text-sm font-semibold text-indigo-700 flex items-center justify-between">
                                <span>我的策略</span>
                                <span
                                    class="text-[10px] font-normal text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                    {{ result.metadata.symbol }}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="p-3">
                            <!-- Metrics Row -->
                            <div class="grid grid-cols-4 gap-2 mb-2">
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">总回报率</p>
                                    <p class="text-base font-bold text-slate-900">{{
                                        formatNumber(result.performance.strategy.totalReturn) }}%</p>
                                </div>
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">年化回报</p>
                                    <p class="text-base font-bold text-slate-900">{{
                                        formatNumber(result.performance.strategy.annualizedReturn) }}%</p>
                                </div>
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">最大回撤</p>
                                    <p class="text-base font-bold text-red-600">{{
                                        formatNumber(result.performance.strategy.maxDrawdown) }}%</p>
                                </div>
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">夏普比率</p>
                                    <p class="text-base font-bold text-slate-900">{{
                                        formatNumber(result.performance.strategy.sharpeRatio) }}</p>
                                </div>
                            </div>

                            <!-- Stats Row -->
                            <div class="grid grid-cols-4 gap-2 text-[10px] pt-2 border-t border-indigo-200/50">
                                <div>
                                    <span class="text-slate-500 block">交易次数</span>
                                    <span class="font-medium text-slate-900">{{
                                        result.performance.strategy.tradeStats.totalTrades }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block">买/卖</span>
                                    <span class="font-medium">
                                        <span class="text-green-600">{{ result.performance.strategy.tradeStats.buyCount
                                            }}</span> /
                                        <span class="text-red-600">{{ result.performance.strategy.tradeStats.sellCount
                                            }}</span>
                                    </span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block">总投入</span>
                                    <span class="font-medium text-slate-900">${{
                                        formatNumber(result.performance.strategy.tradeStats.totalInvested, 0) }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block">总回款</span>
                                    <span class="font-medium text-slate-900">${{
                                        formatNumber(result.performance.strategy.tradeStats.totalProceeds, 0) }}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Benchmark Card -->
                    <Card class="shadow-sm px-1 py-1 gap-0">
                        <CardHeader class="px-3 py-2 border-b border-slate-100">
                            <CardTitle class="text-sm font-semibold text-slate-700">基准：买入并持有</CardTitle>
                        </CardHeader>
                        <CardContent class="p-3">
                            <!-- Metrics Row -->
                            <div class="grid grid-cols-4 gap-2 mb-2">
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">总回报率</p>
                                    <p class="text-base font-bold text-slate-900">{{
                                        formatNumber(result.performance.benchmark.totalReturn) }}%</p>
                                </div>
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">年化回报</p>
                                    <p class="text-base font-bold text-slate-900">{{
                                        formatNumber(result.performance.benchmark.annualizedReturn) }}%</p>
                                </div>
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">最大回撤</p>
                                    <p class="text-base font-bold text-red-600">{{
                                        formatNumber(result.performance.benchmark.maxDrawdown) }}%</p>
                                </div>
                                <div>
                                    <p class="text-[10px] text-slate-500 mb-0.5">夏普比率</p>
                                    <p class="text-base font-bold text-slate-900">{{
                                        formatNumber(result.performance.benchmark.sharpeRatio) }}</p>
                                </div>
                            </div>

                            <!-- Stats Row -->
                            <div class="grid grid-cols-4 gap-2 text-[10px] pt-2 border-t border-slate-100">
                                <div>
                                    <span class="text-slate-500 block">交易次数</span>
                                    <span class="font-medium text-slate-900">1</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block">买/卖</span>
                                    <span class="font-medium">
                                        <span class="text-green-600">1</span> /
                                        <span class="text-slate-400">0</span>
                                    </span>
                                </div>
                                <div class="col-span-2">
                                    <span class="text-slate-500 block">策略说明</span>
                                    <span class="font-medium text-slate-900">期初全仓买入持有至今</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Chart -->
                <div class="flex-1 min-h-[300px] w-full bg-white p-4 rounded-lg border border-slate-200 relative">
                    <Line :data="chartData" :options="chartOptions" />
                </div>
            </div>
            <div v-else class="flex-1 flex items-center justify-center flex-col gap-2">
                <p class="text-lg font-medium text-slate-900">暂无数据</p>
                <p class="text-sm text-slate-500">请运行回测以查看结果</p>
                <p v-if="result && (!result.performance || !result.performance.strategy)"
                    class="text-xs text-red-500 mt-2">
                    数据格式错误: 无法解析性能指标
                </p>
            </div>

            <div class="p-4 border-t bg-slate-50 flex justify-end shrink-0">
                <Button @click="$emit('update:open', false)">关闭报告</Button>
            </div>
        </DialogContent>
    </Dialog>
</template>
