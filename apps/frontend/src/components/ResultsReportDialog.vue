<script setup lang="ts">
import { computed } from 'vue'
import { useStrategyStore } from '@/stores/strategy'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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

const store = useStrategyStore()
const result = computed(() => store.backtestResult)

const chartData = computed(() => {
    if (!result.value) return { labels: [], datasets: [] }

    return {
        labels: result.value.charts.dates,
        datasets: [
            {
                label: '我的策略',
                backgroundColor: '#4f46e5',
                borderColor: '#4f46e5',
                data: result.value.charts.strategyEquity,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y'
            },
            {
                label: '买入并持有',
                backgroundColor: '#94a3b8',
                borderColor: '#94a3b8',
                data: result.value.charts.benchmarkEquity,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y'
            },
            {
                label: 'ETF 价格',
                backgroundColor: '#f59e0b',
                borderColor: '#f59e0b',
                data: result.value.charts.underlyingPrice || [],
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y1',
                hidden: true // 默认隐藏，避免视觉混乱
            }
        ]
    }
})

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
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                    }
                    return label;
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
        <DialogContent class="sm:max-w-7xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>策略回测报告</DialogTitle>
            </DialogHeader>

            <div v-if="result" class="flex-1 overflow-y-auto p-1">
                <!-- KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Card class="border-indigo-200 bg-indigo-50/50">
                        <CardHeader class="pb-2">
                            <CardTitle class="text-indigo-700">我的策略</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-slate-500">总回报率</p>
                                    <p class="text-2xl font-bold text-slate-900">{{
                                        result.performance.strategy.totalReturn.toFixed(2) }}%</p>
                                </div>
                                <div>
                                    <p class="text-sm text-slate-500">年化回报</p>
                                    <p class="text-2xl font-bold text-slate-900">{{
                                        result.performance.strategy.annualizedReturn.toFixed(2) }}%</p>
                                </div>
                                <div>
                                    <p class="text-sm text-slate-500">最大回撤</p>
                                    <p class="text-2xl font-bold text-red-600">{{
                                        result.performance.strategy.maxDrawdown.toFixed(2) }}%</p>
                                </div>
                                <div>
                                    <p class="text-sm text-slate-500">夏普比率</p>
                                    <p class="text-2xl font-bold text-slate-900">{{
                                        result.performance.strategy.sharpeRatio?.toFixed(2) || '-' }}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="pb-2">
                            <CardTitle class="text-slate-700">基准：买入并持有</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-slate-500">总回报率</p>
                                    <p class="text-2xl font-bold text-slate-900">{{
                                        result.performance.benchmark.totalReturn.toFixed(2) }}%</p>
                                </div>
                                <div>
                                    <p class="text-sm text-slate-500">年化回报</p>
                                    <p class="text-2xl font-bold text-slate-900">{{
                                        result.performance.benchmark.annualizedReturn.toFixed(2) }}%</p>
                                </div>
                                <div>
                                    <p class="text-sm text-slate-500">最大回撤</p>
                                    <p class="text-2xl font-bold text-red-600">{{
                                        result.performance.benchmark.maxDrawdown.toFixed(2) }}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Chart -->
                <div class="h-[400px] w-full bg-white p-4 rounded-lg border border-slate-200">
                    <Line :data="chartData" :options="chartOptions" />
                </div>
            </div>
            <div v-else class="flex-1 flex items-center justify-center">
                <p>暂无数据</p>
            </div>

            <div class="mt-4 flex justify-end">
                <Button @click="$emit('update:open', false)">关闭报告</Button>
            </div>
        </DialogContent>
    </Dialog>
</template>
