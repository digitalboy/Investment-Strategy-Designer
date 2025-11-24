<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, MessageSquare } from 'lucide-vue-next'
import type { StrategySummaryDTO } from '@/types'
import { useDateFormatter } from '@/lib/useDateFormatter'

const { t } = useI18n({ useScope: 'global' })
const { formatDate } = useDateFormatter()
const { strategy, rank, showAuthor, manageMode } = withDefaults(defineProps<{
    strategy: StrategySummaryDTO
    rank?: number
    showAuthor?: boolean
    manageMode?: boolean
}>(), {
    showAuthor: true,
    manageMode: false
})

const emit = defineEmits<{
    click: []
    like: []
    comment: []
}>()

const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '--'
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

const formatTriggerCount = (count?: number) => {
    if (typeof count === 'number') return `${count} ${t('community.strategyCard.triggers')}`
    return '--'
}

const getEtfTicker = (strategy: StrategySummaryDTO) => {
    return strategy.etfSymbol || t('community.strategyCard.unspecified')
}

const getRankColor = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 text-white shadow-yellow-500/50'
    if (index === 1) return 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-slate-400/50'
    if (index === 2) return 'bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 text-white shadow-orange-600/50'
    return 'bg-slate-100 text-slate-600'
}
</script>

<template>
    <Card
        class="group h-full pt-5 pb-5 relative flex flex-col bg-linear-to-br from-white via-blue-50/70 to-indigo-100/60 backdrop-blur-sm border border-slate-200/50 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-200/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl"
        @click="emit('click')">
        <!-- ^^^ 修改点 1: 在 class 里添加了 `h-full`，让卡片高度在 Grid 中自动拉伸 -->

        <!-- Rank Badge -->
        <div v-if="typeof rank === 'number'"
            :class="['absolute top-0 right-0 w-11 h-11 flex items-center justify-center rounded-bl-2xl font-bold text-sm shadow-lg z-10 transition-transform group-hover:scale-110', getRankColor(rank)]">
            #{{ rank + 1 }}
        </div>

        <CardContent class="pl-5 pt-0 pb-0 h-full flex flex-col">
            <!-- 1. Top Section -->
            <div class="flex justify-between items-start gap-4">
                <!-- Left Column -->
                <div class="flex-1 min-w-0 space-y-3">
                    <!-- Meta Row -->
                    <div v-if="manageMode" class="flex items-center gap-2">
                        <Badge
                            :class="strategy.isPublic ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
                            class="rounded-lg px-2 py-0.5 font-medium text-[10px] border">
                            {{ strategy.isPublic ? t('community.strategyCard.public') :
                                t('community.strategyCard.draft') }}
                        </Badge>
                        <span class="text-[10px] text-slate-400">{{ formatDate(strategy.updatedAt) }}</span>
                    </div>
                    <div v-else-if="showAuthor" class="flex items-center gap-2 mb-2">
                        <Avatar class="h-6 w-6 border-2 border-indigo-100 shadow-sm">
                            <AvatarImage v-if="strategy.author?.photoUrl" :src="strategy.author.photoUrl"
                                :alt="strategy.author?.displayName" />
                            <AvatarFallback
                                class="text-[10px] bg-linear-to-br from-indigo-50 to-blue-50 text-indigo-600 font-bold">
                                {{ (strategy.author?.displayName || strategy.author?.email ||
                                    'U').charAt(0).toUpperCase() }}
                            </AvatarFallback>
                        </Avatar>
                        <span class="text-xs text-slate-600 truncate max-w-[120px] font-medium">
                            @{{ strategy.author?.displayName || t('community.strategyCard.unknown') }}
                        </span>
                    </div>

                    <!-- Title & Ticker -->
                    <div>
                        <h3
                            class="text-lg font-bold text-slate-900 leading-tight mb-4 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {{ strategy.name }}
                        </h3>
                        <div class="flex items-center gap-2">
                            <Badge variant="outline"
                                class="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold px-2.5 py-0.5 text-xs rounded-lg">
                                {{ getEtfTicker(strategy) }}
                            </Badge>
                            <span class="text-xs text-slate-400 flex items-center gap-1.5">
                                <span class="w-1 h-1 rounded-full bg-indigo-300"></span>
                                {{ formatTriggerCount(strategy.triggerCount) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Right Column -->
                <div class="flex flex-col items-end justify-center pl-4 border-l border-slate-200 min-w-[100px] py-1 shrink-0"
                    :class="{ 'mt-4': !manageMode }">
                    <div class="text-right mb-3">
                        <div class="text-2xl font-bold tracking-tight"
                            :class="strategy.returnRate && strategy.returnRate > 0 ? 'text-emerald-600' : 'text-slate-800'">
                            {{ formatPercent(strategy.returnRate) }}
                        </div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                            {{ t('community.strategyCard.annualReturn') }}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-semibold text-slate-700">
                            {{ formatPercent(strategy.maxDrawdown) }}
                        </div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                            {{ t('community.strategyCard.maxDrawdown') }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. Middle Section: Tags -->
            <!-- 修改点 2: 添加 v-if 判断。如果没标签，连这个 div 都不渲染，避免占据高度或 margin -->
            <div v-if="strategy.tags && strategy.tags.length > 0" class="mt-4 flex flex-wrap gap-1.5">
                <Badge v-for="tag in strategy.tags.slice(0, 5)" :key="tag" variant="secondary"
                    class="bg-blue-50 text-blue-600 border border-blue-100 font-normal text-[10px] px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors">
                    {{ tag }}
                </Badge>
            </div>

            <!-- 3. Footer Section: Social & Date -->
            <!-- 修改点 3: 使用 `mt-auto`。这会自动吸附到底部，无论上面内容是多是少 -->
            <div v-if="!manageMode" class="mt-auto flex justify-between items-center pt-3 border-t border-slate-100/80">
                <div class="flex gap-4 text-slate-400">
                    <button @click.stop="emit('like')"
                        class="flex items-center gap-1.5 hover:text-red-500 transition-all group/like text-xs font-medium">
                        <Heart
                            class="w-4 h-4 group-hover/like:fill-current group-hover/like:scale-110 transition-transform"
                            :class="{ 'fill-red-500 text-red-500': false }" />
                        <span>{{ strategy.stats.likes }}</span>
                    </button>
                    <button @click.stop="emit('comment')"
                        class="flex items-center gap-1.5 hover:text-indigo-500 transition-all text-xs font-medium">
                        <MessageSquare class="w-4 h-4" />
                        <span>{{ strategy.stats.comments || 0 }}</span>
                    </button>
                </div>
                <div class="text-[10px] text-slate-400 font-medium">{{ formatDate(strategy.updatedAt) }}</div>
            </div>
        </CardContent>
    </Card>
</template>