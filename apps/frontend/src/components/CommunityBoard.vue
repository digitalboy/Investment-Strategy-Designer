<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useStrategyStore } from '@/stores/strategy'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Trophy, Heart, MessageSquare, RefreshCw } from 'lucide-vue-next'
import type { StrategySummaryDTO } from '@/types'

const emit = defineEmits(['create-strategy', 'view-strategy'])

const strategyStore = useStrategyStore()
const authStore = useAuthStore()
const { publicStrategies, userStrategies, isLoading, currentStrategyComments } = storeToRefs(strategyStore)

const sortBy = ref<'recent' | 'popular' | 'return'>('return')
const showCommentsDialog = ref(false)
const selectedStrategyId = ref<string | null>(null)
const newComment = ref('')

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

const handleAddComment = async () => {
    if (!selectedStrategyId.value || !newComment.value.trim()) return

    try {
        await strategyStore.addComment(selectedStrategyId.value, newComment.value)
        newComment.value = ''
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
    if (index === 0) return 'bg-yellow-400 text-yellow-900' // Gold
    if (index === 1) return 'bg-slate-300 text-slate-900'   // Silver
    if (index === 2) return 'bg-amber-600 text-amber-100'   // Bronze
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
    <div class="min-h-screen bg-linear-to-br from-indigo-500 to-purple-600 p-6 -m-6 rounded-none">
        <div class="max-w-7xl mx-auto space-y-12">

            <!-- My Strategy Library -->
            <div v-if="authStore.isAuthenticated" class="space-y-6">
                <div class="flex justify-between items-center text-white">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            class="lucide lucide-folder-open">
                            <path
                                d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-3.25 7a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2" />
                        </svg>
                        <h2 class="text-2xl font-bold tracking-tight">我的策略库</h2>
                    </div>
                    <div class="flex items-center gap-3">
                        <Button variant="secondary" size="sm"
                            class="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
                            @click="strategyStore.fetchUserStrategies()">
                            <RefreshCw class="mr-2 h-4 w-4" />
                            刷新
                        </Button>
                        <Button variant="secondary" size="sm"
                            class="bg-white text-indigo-600 hover:bg-white/90 border-none shadow-sm"
                            @click="emit('create-strategy')">
                            <Plus class="mr-2 h-4 w-4" />
                            新建策略
                        </Button>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- User Strategies -->
                    <Card v-for="strategy in userStrategies" :key="strategy.id"
                        class="group relative flex flex-col bg-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl"
                        @click="emit('view-strategy', strategy.id)">
                        <CardContent class="pl-5">
                            <div class="flex justify-between items-start gap-4">
                                <!-- Left Side: Identity & Context -->
                                <div class="flex-1 min-w-0 space-y-3">
                                    <!-- Meta Row -->
                                    <div class="flex items-center gap-2">
                                        <Badge
                                            :class="strategy.isPublic ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'"
                                            class="rounded-md px-2 py-0.5 font-normal text-[10px]">
                                            {{ strategy.isPublic ? '公开' : '草稿' }}
                                        </Badge>
                                        <span class="text-[10px] text-slate-400">{{ formatDate(strategy.updatedAt)
                                            }}</span>
                                    </div>

                                    <!-- Title & Ticker -->
                                    <div>
                                        <h3
                                            class="text-lg font-bold text-slate-800 leading-tight mb-1.5 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {{ strategy.name }}
                                        </h3>
                                        <div class="flex items-center gap-2">
                                            <Badge variant="outline"
                                                class="bg-indigo-50 text-indigo-700 border-indigo-100 font-semibold px-2 py-0.5 text-xs">
                                                {{ getEtfTicker(strategy) }}
                                            </Badge>
                                            <span class="text-xs text-slate-400 flex items-center gap-1">
                                                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                                {{ formatTriggerCount(strategy.triggerCount) }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Tags -->
                                    <div class="flex flex-wrap gap-1.5 pt-1">
                                        <Badge variant="secondary"
                                            class="bg-slate-50 text-slate-500 font-normal text-[10px] px-2 py-0.5">
                                            Momentum
                                        </Badge>
                                        <Badge variant="secondary"
                                            class="bg-slate-50 text-slate-500 font-normal text-[10px] px-2 py-0.5">
                                            RSI
                                        </Badge>
                                        <Badge variant="secondary"
                                            class="bg-slate-50 text-slate-500 font-normal text-[10px] px-2 py-0.5">
                                            Mean Reversion
                                        </Badge>
                                    </div>
                                </div>

                                <!-- Right Side: Performance -->
                                <div
                                    class="flex flex-col items-end justify-center pl-4 border-l border-slate-100 min-w-[100px] py-1">
                                    <div class="text-right mb-3">
                                        <div class="text-2xl font-bold tracking-tight"
                                            :class="strategy.returnRate && strategy.returnRate > 0 ? 'text-green-600' : 'text-slate-800'">
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
                <div class="flex justify-between items-center text-white">
                    <div class="flex items-center gap-2">
                        <Trophy class="h-6 w-6 text-yellow-300" />
                        <h2 class="text-2xl font-bold tracking-tight">精选榜单</h2>
                    </div>
                    <div class="flex gap-2 bg-white/10 p-1 rounded-lg backdrop-blur-sm">
                        <button v-for="sort in ['recent', 'popular', 'return']" :key="sort"
                            @click="handleSortChange(sort as any)" :class="[
                                'px-3 py-1.5 text-sm rounded-md transition-all',
                                sortBy === sort ? 'bg-white text-indigo-600 font-medium shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'
                            ]">
                            {{ sort === 'recent' ? '最新发布' : (sort === 'popular' ? '最受欢迎' : '收益率') }}
                        </button>
                    </div>
                </div>

                <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div v-for="i in 6" :key="i" class="h-64 bg-white/10 rounded-2xl animate-pulse"></div>
                </div>

                <div v-else-if="publicStrategies.length === 0"
                    class="text-center py-12 text-white/60 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                    暂无公开策略，快来分享你的第一个策略吧！
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card v-for="(strategy, index) in publicStrategies" :key="strategy.id"
                        class="group relative flex flex-col bg-white border-none shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl"
                        @click="emit('view-strategy', strategy.id)">

                        <!-- Rank Badge -->
                        <div
                            :class="['absolute top-0 right-0 w-12 h-12 flex items-center justify-center rounded-bl-2xl font-bold text-lg shadow-sm z-10', getRankColor(index)]">
                            #{{ index + 1 }}
                        </div>

                        <CardContent class="pl-5 ">
                            <div class="flex justify-between items-start gap-4">
                                <!-- Left Side: Identity & Context -->
                                <div class="flex-1 min-w-0 space-y-3">
                                    <!-- Author Row -->
                                    <div class="flex items-center gap-2 mb-1">
                                        <Avatar class="h-5 w-5 border border-indigo-50">
                                            <AvatarImage v-if="strategy.author?.photoUrl"
                                                :src="strategy.author.photoUrl" :alt="strategy.author?.displayName" />
                                            <AvatarFallback class="text-[10px] bg-indigo-50 text-indigo-600 font-bold">
                                                {{ (strategy.author?.displayName || strategy.author?.email ||
                                                    'U').charAt(0).toUpperCase() }}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span class="text-xs text-slate-500 truncate max-w-[120px]">
                                            @{{ strategy.author?.displayName || 'Unknown' }}
                                        </span>
                                    </div>

                                    <!-- Title & Ticker -->
                                    <div>
                                        <h3
                                            class="text-lg font-bold text-slate-800 leading-tight mb-1.5 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {{ strategy.name }}
                                        </h3>
                                        <div class="flex items-center gap-2">
                                            <Badge variant="outline"
                                                class="bg-indigo-50 text-indigo-700 border-indigo-100 font-semibold px-2 py-0.5 text-xs">
                                                {{ getEtfTicker(strategy) }}
                                            </Badge>
                                            <span class="text-xs text-slate-400 flex items-center gap-1">
                                                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                                {{ formatTriggerCount(strategy.triggerCount) }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Tags -->
                                    <div class="flex flex-wrap gap-1.5 pt-1">
                                        <Badge variant="secondary"
                                            class="bg-slate-50 text-slate-500 font-normal text-[10px] px-2 py-0.5">
                                            Momentum
                                        </Badge>
                                        <Badge variant="secondary"
                                            class="bg-slate-50 text-slate-500 font-normal text-[10px] px-2 py-0.5">
                                            Factor
                                        </Badge>
                                        <Badge variant="secondary"
                                            class="bg-slate-50 text-slate-500 font-normal text-[10px] px-2 py-0.5">
                                            Macro
                                        </Badge>
                                    </div>
                                </div>

                                <!-- Right Side: Performance -->
                                <div
                                    class="flex flex-col items-end justify-center pl-4 border-l border-slate-100 min-w-[100px] py-1 mt-4">
                                    <div class="text-right mb-3">
                                        <div class="text-2xl font-bold tracking-tight"
                                            :class="strategy.returnRate && strategy.returnRate > 0 ? 'text-green-600' : 'text-slate-800'">
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
                            <div class="flex justify-between items-center pt-3 mt-2 border-t border-slate-50">
                                <div class="flex gap-3 text-slate-400">
                                    <button @click.stop="handleLike(strategy.id)"
                                        class="flex items-center gap-1 hover:text-red-500 transition-colors group/like text-xs">
                                        <Heart class="w-3.5 h-3.5 group-hover/like:fill-current"
                                            :class="{ 'fill-red-500 text-red-500': false }" />
                                        <span>{{ strategy.stats.likes }}</span>
                                    </button>
                                    <button @click.stop="openComments(strategy.id)"
                                        class="flex items-center gap-1 hover:text-indigo-500 transition-colors text-xs">
                                        <MessageSquare class="w-3.5 h-3.5" />
                                        <span>{{ strategy.stats.views }}</span>
                                    </button>
                                </div>
                                <div class="text-[10px] text-slate-300">{{ formatDate(strategy.updatedAt) }}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Comments Dialog -->
                <Dialog :open="showCommentsDialog" @update:open="showCommentsDialog = $event">
                    <DialogContent class="sm:max-w-[500px] max-h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>评论区</DialogTitle>
                            <DialogDescription>
                                查看和发表关于此策略的评论。
                            </DialogDescription>
                        </DialogHeader>

                        <div class="grow overflow-y-auto py-4 space-y-4 min-h-[200px]">
                            <div v-if="currentStrategyComments.length === 0" class="text-center text-slate-500 py-8">
                                暂无评论，快来抢沙发！
                            </div>
                            <div v-for="comment in currentStrategyComments" :key="comment.id" class="flex gap-3">
                                <Avatar class="h-8 w-8">
                                    <AvatarFallback>{{ comment.user_email?.charAt(0).toUpperCase() || 'U' }}
                                    </AvatarFallback>
                                </Avatar>
                                <div class="bg-slate-100 p-3 rounded-lg grow">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-xs font-medium text-slate-700">{{ comment.user_email || '匿名用户'
                                        }}</span>
                                        <span class="text-xs text-slate-400">{{ formatDate(comment.created_at) }}</span>
                                    </div>
                                    <p class="text-sm text-slate-800">{{ comment.content }}</p>
                                </div>
                            </div>
                        </div>

                        <div class="border-t pt-4 mt-auto">
                            <div class="flex gap-2">
                                <Input v-model="newComment" placeholder="写下你的想法..." @keyup.enter="handleAddComment" />
                                <Button @click="handleAddComment" :disabled="!newComment.trim()">发送</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    </div>
</template>
