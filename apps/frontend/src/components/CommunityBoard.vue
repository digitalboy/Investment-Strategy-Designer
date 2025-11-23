<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useStrategyStore } from '@/stores/strategy'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import CommentsDialog from '@/components/CommentsDialog.vue'
import StrategyCard from '@/components/shared/StrategyCard.vue'
import { Plus, Trophy, RefreshCw } from 'lucide-vue-next'

const emit = defineEmits(['create-strategy', 'view-strategy'])

const strategyStore = useStrategyStore()
const authStore = useAuthStore()
const { publicStrategies, userStrategies, isLoading, currentStrategyComments, hasMoreComments } = storeToRefs(strategyStore)

const sortBy = ref<'recent' | 'popular' | 'return'>('return')
const showCommentsDialog = ref(false)
const selectedStrategyId = ref<string | null>(null)
const currentStrategyInfo = ref<{ name: string, author: { name?: string, photo?: string } } | null>(null)

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
    
    // Find strategy info to display in dialog header
    const strategy = publicStrategies.value.find(s => s.id === id) || userStrategies.value.find(s => s.id === id)
    if (strategy) {
        currentStrategyInfo.value = {
            name: strategy.name,
            author: {
                name: strategy.author?.displayName || strategy.author?.email?.split('@')[0],
                photo: strategy.author?.photoUrl
            }
        }
    } else {
        currentStrategyInfo.value = null
    }

    showCommentsDialog.value = true
    await strategyStore.fetchComments(id)
}

// Handle adding a comment, including replies (optional parentId)
const handleAddComment = async (content: string, parentId?: string) => {
    if (!selectedStrategyId.value) return

    try {
        await strategyStore.addComment(selectedStrategyId.value, content, parentId)
    } catch (error) {
        console.error('Failed to add comment', error)
    }
}

const handleLoadMoreComments = async () => {
    if (!selectedStrategyId.value) return
    await strategyStore.loadMoreComments(selectedStrategyId.value)
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
                            我的策略</h2>
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
                <StrategyCard 
                    v-for="strategy in userStrategies" 
                    :key="strategy.id" 
                    :strategy="strategy"
                    :manage-mode="true"
                    @click="emit('view-strategy', strategy.id)"
                />
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
                            精选榜单</h2>
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
                <StrategyCard 
                    v-for="(strategy, index) in publicStrategies" 
                    :key="strategy.id" 
                    :strategy="strategy"
                    :rank="index"
                    @click="emit('view-strategy', strategy.id)"
                    @like="handleLike(strategy.id)"
                    @comment="openComments(strategy.id)"
                />
            </div>

            <!-- Comments Dialog -->
            <CommentsDialog 
                :open="showCommentsDialog" 
                @update:open="showCommentsDialog = $event"
                :comments="currentStrategyComments" 
                :has-more="hasMoreComments"
                :strategy-name="currentStrategyInfo?.name"
                :author="currentStrategyInfo?.author"
                title="评论区" 
                description="查看和发表关于此策略的评论。"
                @add-comment="handleAddComment" 
                @load-more="handleLoadMoreComments"
            />
        </div>
    </div>

</template>