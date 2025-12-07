<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { Dices, TrendingUp, Clock, ExternalLink, Loader2 } from 'lucide-vue-next'
import { polymarketService, type ChartAnnotationMarket } from '@/services/polymarketService'

const props = defineProps<{
    dateRange?: { start: string; end: string }
    selectedMarket?: ChartAnnotationMarket | null
}>()

const emit = defineEmits<{
    select: [market: ChartAnnotationMarket | null]
    dataLoaded: [data: ChartAnnotationMarket[]]
}>()

const { t } = useI18n()

const markets = ref<ChartAnnotationMarket[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// 按 volume 排序的市场列表
const sortedMarkets = computed(() => {
    return [...markets.value].sort((a, b) => b.volume - a.volume)
})

// 加载数据
const loadMarkets = async () => {
    loading.value = true
    error.value = null
    try {
        const response = await polymarketService.getTrendingMarkets({
            limit: 30,
            minVolume: 1000000
        })
        if (response.success && response.data) {
            markets.value = polymarketService.transformForAnnotations(
                response.data,
                props.dateRange
            )
            emit('dataLoaded', markets.value)
        }
    } catch (e) {
        error.value = 'Failed to load prediction markets'
        console.error('Polymarket load error:', e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadMarkets()
})

// 当日期范围变化时重新加载
watch(() => props.dateRange, () => {
    loadMarkets()
}, { deep: true })

// 处理选择市场
const handleSelect = (market: ChartAnnotationMarket) => {
    if (props.selectedMarket?.id === market.id) {
        emit('select', null) // 取消选中
    } else {
        emit('select', market) // 选中
    }
}

// 判断是否选中
const isSelected = (market: ChartAnnotationMarket) => {
    return props.selectedMarket?.id === market.id
}

// 获取状态徽章样式
const getStatusBadgeClass = (market: ChartAnnotationMarket) => {
    if (market.closed) {
        if (market.winner === 'Yes') return 'bg-green-100 text-green-700 border-green-200'
        if (market.winner === 'No') return 'bg-red-100 text-red-700 border-red-200'
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
    return 'bg-amber-100 text-amber-700 border-amber-200'
}

// 格式化日期
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: '2-digit'
    }).format(date)
}
</script>

<template>
    <Card
        class="h-full flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/40 bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader class="pb-3 border-b border-slate-100">
            <CardTitle class="text-base font-semibold flex items-center gap-2 text-slate-800">
                <Dices class="w-4 h-4 text-purple-500" />
                {{ t('polymarket.title') }}
                <Badge v-if="!loading && markets.length > 0" variant="secondary"
                    class="ml-auto text-xs bg-purple-100 text-purple-700">
                    {{ markets.length }}
                </Badge>
            </CardTitle>
        </CardHeader>

        <CardContent class="p-0 flex-1 overflow-y-auto custom-scrollbar">
            <!-- Loading State -->
            <div v-if="loading" class="p-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 class="w-6 h-6 animate-spin mb-2" />
                <span class="text-sm">{{ t('common.loading') }}</span>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="p-8 text-center text-red-500 text-sm">
                {{ error }}
            </div>

            <!-- Empty State -->
            <div v-else-if="sortedMarkets.length === 0" class="p-8 text-center text-slate-400 text-sm">
                {{ t('polymarket.noMarkets') }}
            </div>

            <!-- Markets List -->
            <Accordion v-else type="single" collapsible class="w-full">
                <AccordionItem v-for="(market, index) in sortedMarkets.slice(0, 10)" :key="market.id"
                    :value="`market-${index}`" class="border-b border-slate-50 last:border-0"
                    :class="{ 'bg-purple-50/70 ring-1 ring-purple-200': isSelected(market) }">
                    <AccordionTrigger class="px-4 py-3 hover:bg-purple-50/50 transition-colors group"
                        @click="handleSelect(market)">
                        <div class="flex items-center justify-between w-full pr-2">
                            <div class="flex items-center gap-3">
                                <!-- Rank Badge with selection indicator -->
                                <Badge variant="outline"
                                    class="w-6 h-6 rounded-full flex items-center justify-center p-0 border text-xs font-bold"
                                    :class="isSelected(market)
                                        ? 'bg-purple-500 text-white border-purple-500'
                                        : 'bg-purple-100 text-purple-700 border-purple-200'">
                                    {{ index + 1 }}
                                </Badge>

                                <!-- Market Info -->
                                <div class="flex flex-col items-start text-left">
                                    <span class="text-sm font-medium transition-colors line-clamp-1 max-w-[180px]"
                                        :class="isSelected(market) ? 'text-purple-700' : 'text-slate-700 group-hover:text-purple-700'">
                                        {{ market.title }}
                                    </span>
                                    <span class="text-[10px] text-slate-400">
                                        {{ market.volumeFormatted }} {{ t('polymarket.volume') }}
                                    </span>
                                </div>
                            </div>

                            <!-- Status Badge -->
                            <Badge variant="outline" :class="['text-[10px] px-2 py-0.5', getStatusBadgeClass(market)]">
                                <template v-if="market.closed">
                                    ✓ {{ market.winner }}
                                </template>
                                <template v-else>
                                    <Clock class="w-3 h-3 mr-1" />
                                    {{ t('polymarket.active') }}
                                </template>
                            </Badge>
                        </div>
                    </AccordionTrigger>

                    <AccordionContent class="px-4 pb-4 bg-slate-50/30">
                        <div class="space-y-3 pt-2">
                            <!-- Primary Question -->
                            <div class="text-xs text-slate-600">
                                {{ market.primaryQuestion }}
                            </div>

                            <!-- Outcomes -->
                            <div class="flex flex-wrap gap-2">
                                <div v-for="outcome in market.outcomes" :key="outcome.name"
                                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" :class="outcome.name === market.winner
                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-300'
                                        : 'bg-slate-100 text-slate-600'">
                                    <span class="font-medium">{{ outcome.name }}</span>
                                    <span class="font-mono">{{ outcome.probability }}%</span>
                                    <TrendingUp v-if="outcome.name === market.winner" class="w-3 h-3 text-green-600" />
                                </div>
                            </div>

                            <!-- Date Range -->
                            <div
                                class="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                                <span>📅 {{ formatDate(market.startDate) }} → {{ formatDate(market.endDate) }}</span>
                                <a :href="market.url" target="_blank" rel="noopener noreferrer"
                                    class="flex items-center gap-1 text-purple-600 hover:text-purple-800 hover:underline">
                                    Polymarket
                                    <ExternalLink class="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <!-- Show More Hint -->
            <div v-if="sortedMarkets.length > 10"
                class="p-3 text-center text-xs text-slate-400 border-t border-slate-100">
                {{ t('polymarket.andMore', { count: sortedMarkets.length - 10 }) }}
            </div>
        </CardContent>
    </Card>
</template>
