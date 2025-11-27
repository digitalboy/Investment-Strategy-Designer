<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js'
import type { BacktestResultDTO } from '@/types'

const { t } = useI18n()

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)

const props = defineProps<{
    result: BacktestResultDTO
}>()

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
                backgroundColor: '#4f46e5',
                borderColor: '#4f46e5',
                borderWidth: 2,
                data: props.result.charts.strategyEquity,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y',
                order: 2
            },
            {
                label: t('strategy.backtestChart.buyAndHold'),
                backgroundColor: '#94a3b8',
                borderColor: '#94a3b8',
                borderWidth: 1.5,
                data: props.result.charts.benchmarkEquity,
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y',
                order: 3
            },
            {
                label: t('strategy.backtestChart.weeklyDCA'),
                backgroundColor: '#8b5cf6',
                borderColor: '#8b5cf6',
                borderWidth: 1.5,
                data: props.result.charts.dcaEquity || [],
                tension: 0.1,
                pointRadius: 0,
                yAxisID: 'y',
                order: 3
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
                        valueLabel += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
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
