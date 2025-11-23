<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useStrategyStore } from '@/stores/strategy'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import CommentsDialog from '@/components/CommentsDialog.vue'
import { Plus, Trophy, Heart, MessageSquare, RefreshCw } from 'lucide-vue-next'
import type { StrategySummaryDTO } from '@/types'

const emit = defineEmits(['create-strategy', 'view-strategy'])

const strategyStore = useStrategyStore()
const authStore = useAuthStore()
const { publicStrategies, userStrategies, isLoading, currentStrategyComments } = storeToRefs(strategyStore)

const sortBy = ref<'recent' | 'popular' | 'return'>('return')
const showCommentsDialog = ref(false)
const selectedStrategyId = ref<string | null>(null)

onMounted(() => {
    loadStrategies()
    if (authStore.isAuthenticated) {
        strategyStore.fetchUserStrategies()
    }
})

watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    if (isAuthenticated) {
        strategyStore.fetchUserStrategies()
    }
})

const loadStrategies = async () => {
    await strategyStore.fetchPublicStrategies(sortBy.value)
}

const handleSortChange = async (newSort: 'recent' | 'popular' | 'return') => {
    sortBy.value = newSort
    await loadStrategies()
}

const handleLike = async (id: string) => {
    try {
        await strategyStore.toggleLike(id)
        // Refresh to show updated like count
        await loadStrategies()
    } catch (error) {
        console.error('Failed to like strategy', error)
    }
}

const openComments = async (id: string) => {
    selectedStrategyId.value = id
    showCommentsDialog.value = true
    await strategyStore.fetchComments(id)
}

const handleAddComment = async (content: string) => {
    if (!selectedStrategyId.value) return

    try {
        await strategyStore.addComment(selectedStrategyId.value, content)
    } catch (error) {
        console.error('Failed to add comment', error)
    }
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 1) return '刚刚更新'
    if (diffDays < 7) return `${diffDays}天前更新`
    return date.toLocaleDateString()
}

const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '--'
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

const getRankColor = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 text-white shadow-yellow-500/50' // Gold
    if (index === 1) return 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-slate-400/50'   // Silver
    if (index === 2) return 'bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 text-white shadow-orange-600/50'   // Bronze
    return 'bg-slate-100 text-slate-600'
}

const formatTriggerCount = (count?: number) => {
    if (typeof count === 'number') return `${count} 个`
    return '--'
}

const getEtfTicker = (strategy: Partial<StrategySummaryDTO> & { symbol?: string; metadata?: { symbol?: string } }) => {
    return strategy?.etfSymbol || strategy?.symbol || strategy?.metadata?.symbol || '未指定'
}
</script>

<template>
    <div class="space-y-16">
        <!-- My Strategy Library -->
        <div v-if="authStore.isAuthenticated" class="space-y-6">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div
                        class="p-2.5 bg-linear-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            class="text-white">
                            <path
                                d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-3.25 7a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2" />
                        </svg>
                    </div>
                    <div>
                        <h2
                            class="text-2xl font-bold tracking-tight bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            我的策略库</h2>
                        <p class="text-sm text-slate-500 mt-0.5">管理和优化您的投资策略</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <Button variant="outline" size="sm"
                        class="border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                        @click="strategyStore.fetchUserStrategies()">
                        <RefreshCw class="mr-2 h-4 w-4" />
                        刷新
                    </Button>
                    <Button size="sm"
                        class="bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white border-none shadow-lg shadow-indigo-500/30 transition-all"
                        @click="emit('create-strategy')">
                        <Plus class="mr-2 h-4 w-4" />
                        新建策略
                    </Button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- User Strategies -->
                <Card v-for="strategy in userStrategies" :key="strategy.id"
                    class="group relative flex flex-col bg-linear-to-br from-white via-blue-50/70 to-indigo-100/60 backdrop-blur-sm border border-slate-200/50 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-200/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl"
                    @click="emit('view-strategy', strategy.id)">
                    <CardContent class="pl-5">
                        <div class="flex justify-between items-start gap-4">
                            <!-- Left Side: Identity & Context -->
                            <div class="flex-1 min-w-0 space-y-3">
                                <!-- Meta Row -->
                                <div class="flex items-center gap-2">
                                    <Badge
                                        :class="strategy.isPublic ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
                                        class="rounded-lg px-2 py-0.5 font-medium text-[10px] border">
                                        {{ strategy.isPublic ? '✓ 公开' : '草稿' }}
                                    </Badge>
                                    <span class="text-[10px] text-slate-400">{{ formatDate(strategy.updatedAt) }}</span>
                                </div>

                                <!-- Title & Ticker -->
                                <div>
                                    <h3
                                        class="text-lg font-bold text-slate-900 leading-tight mb-1.5 line-clamp-1 group-hover:text-indigo-600 transition-colors">
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

                                <!-- Tags -->
                                <div class="flex flex-wrap gap-1.5 pt-1">
                                    <Badge variant="secondary"
                                        class="bg-blue-50 text-blue-600 border border-blue-100 font-normal text-[10px] px-2 py-0.5 rounded-md">
                                        Momentum
                                    </Badge>
                                    <Badge variant="secondary"
                                        class="bg-violet-50 text-violet-600 border border-violet-100 font-normal text-[10px] px-2 py-0.5 rounded-md">
                                        RSI
                                    </Badge>
                                    <Badge variant="secondary"
                                        class="bg-cyan-50 text-cyan-600 border border-cyan-100 font-normal text-[10px] px-2 py-0.5 rounded-md">
                                        Mean Reversion
                                    </Badge>
                                </div>
                            </div>

                            <!-- Right Side: Performance -->
                            <div
                                class="flex flex-col items-end justify-center pl-4 border-l border-slate-200 min-w-[100px] py-1">
                                <div class="text-right mb-3">
                                    <div class="text-2xl font-bold tracking-tight"
                                        :class="strategy.returnRate && strategy.returnRate > 0 ? 'text-emerald-600' : 'text-slate-800'">
                                        {{ formatPercent(strategy.returnRate) }}
                                    </div>
                                    <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                        年化收益</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-semibold text-slate-700">
                                        {{ formatPercent(strategy.maxDrawdown) }}
                                    </div>
                                    <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                        最大回撤</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>

        </div>

        <!-- Community Leaderboard -->
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div
                        class="p-2.5 bg-linear-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg shadow-yellow-500/30">
                        <Trophy class="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2
                            class="text-2xl font-bold tracking-tight bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            社区精选榜单</h2>
                        <p class="text-sm text-slate-500 mt-0.5">发现顶尖量化策略</p>
                    </div>
                </div>
                <div class="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    <button v-for="sort in ['recent', 'popular', 'return']" :key="sort"
                        @click="handleSortChange(sort as any)" :class="[
                            'px-4 py-2 text-sm rounded-lg transition-all font-medium',
                            sortBy === sort ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        ]">
                        {{ sort === 'recent' ? '最新发布' : (sort === 'popular' ? '最受欢迎' : '收益率') }}
                    </button>
                </div>
            </div>

            <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="i in 6" :key="i"
                    class="h-64 bg-slate-100 rounded-2xl animate-pulse border border-slate-200"></div>
            </div>

            <div v-else-if="publicStrategies.length === 0"
                class="text-center py-16 text-slate-500 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <div class="flex flex-col items-center gap-3">
                    <div class="p-4 bg-slate-100 rounded-full">
                        <Trophy class="h-8 w-8 text-slate-400" />
                    </div>
                    <p class="text-lg font-medium">暂无公开策略</p>
                    <p class="text-sm text-slate-400">快来分享你的第一个策略吧！</p>
                </div>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card v-for="(strategy, index) in publicStrategies" :key="strategy.id"
                    class="group relative flex flex-col bg-linear-to-br from-white via-violet-50/65 to-purple-100/55 backdrop-blur-sm border border-slate-200/50 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-200/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl"
                    @click="emit('view-strategy', strategy.id)"> <!-- Rank Badge -->
                    <div
                        :class="['absolute top-0 right-0 w-11 h-11 flex items-center justify-center rounded-bl-2xl font-bold text-sm shadow-lg z-10 transition-transform group-hover:scale-110', getRankColor(index)]">
                        #{{ index + 1 }}
                    </div>

                    <CardContent class="pl-5 ">
                        <div class="flex justify-between items-start gap-4">
                            <!-- Left Side: Identity & Context -->
                            <div class="flex-1 min-w-0 space-y-3">
                                <!-- Author Row -->
                                <div class="flex items-center gap-2 mb-1">
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
                                        @{{ strategy.author?.displayName || 'Unknown' }}
                                    </span>
                                </div>

                                <!-- Title & Ticker -->
                                <div>
                                    <h3
                                        class="text-lg font-bold text-slate-900 leading-tight mb-1.5 line-clamp-1 group-hover:text-indigo-600 transition-colors">
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

                                <!-- Tags -->
                                <div class="flex flex-wrap gap-1.5 pt-1">
                                    <Badge variant="secondary"
                                        class="bg-blue-50 text-blue-600 border border-blue-100 font-normal text-[10px] px-2 py-0.5 rounded-md">
                                        Momentum
                                    </Badge>
                                    <Badge variant="secondary"
                                        class="bg-violet-50 text-violet-600 border border-violet-100 font-normal text-[10px] px-2 py-0.5 rounded-md">
                                        Factor
                                    </Badge>
                                    <Badge variant="secondary"
                                        class="bg-cyan-50 text-cyan-600 border border-cyan-100 font-normal text-[10px] px-2 py-0.5 rounded-md">
                                        Macro
                                    </Badge>
                                </div>
                            </div>

                            <!-- Right Side: Performance -->
                            <div
                                class="flex flex-col items-end justify-center pl-4 border-l border-slate-200 min-w-[100px] py-1 mt-4">
                                <div class="text-right mb-3">
                                    <div class="text-2xl font-bold tracking-tight"
                                        :class="strategy.returnRate && strategy.returnRate > 0 ? 'text-emerald-600' : 'text-slate-800'">
                                        {{ formatPercent(strategy.returnRate) }}
                                    </div>
                                    <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                        年化收益</div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-semibold text-slate-700">
                                        {{ formatPercent(strategy.maxDrawdown) }}
                                    </div>
                                    <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                        最大回撤</div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer: Social & Date -->
                        <div class="flex justify-between items-center pt-3 mt-2 border-t border-slate-100">
                            <div class="flex gap-4 text-slate-400">
                                <button @click.stop="handleLike(strategy.id)"
                                    class="flex items-center gap-1.5 hover:text-red-500 transition-all group/like text-xs font-medium">
                                    <Heart
                                        class="w-4 h-4 group-hover/like:fill-current group-hover/like:scale-110 transition-transform"
                                        :class="{ 'fill-red-500 text-red-500': false }" />
                                    <span>{{ strategy.stats.likes }}</span>
                                </button>
                                <button @click.stop="openComments(strategy.id)"
                                    class="flex items-center gap-1.5 hover:text-indigo-500 transition-all text-xs font-medium">
                                    <MessageSquare class="w-4 h-4" />
                                    <span>{{ strategy.stats.comments || 0 }}</span>
                                </button>
                            </div>
                            <div class="text-[10px] text-slate-400 font-medium">{{ formatDate(strategy.updatedAt) }}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Comments Dialog -->
            <CommentsDialog :open="showCommentsDialog" @update:open="showCommentsDialog = $event"
                :comments="currentStrategyComments" title="评论区" description="查看和发表关于此策略的评论。"
                @add-comment="handleAddComment" />
        </div>
    </div>

</template>
