<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useStrategyStore } from '@/stores/strategy'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-vue-next'

const emit = defineEmits(['create-strategy', 'view-strategy'])

const strategyStore = useStrategyStore()
const authStore = useAuthStore()
const { publicStrategies, userStrategies, isLoading, currentStrategyComments } = storeToRefs(strategyStore)

const sortBy = ref<'recent' | 'popular' | 'return'>('recent')
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
    return new Date(dateString).toLocaleDateString()
}
</script>

<template>
    <div class="space-y-6">
        <!-- My Strategy Library -->
        <div v-if="authStore.isAuthenticated" class="space-y-4">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold tracking-tight">我的策略</h2>
                <Button variant="ghost" size="sm" @click="strategyStore.fetchUserStrategies()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="mr-2 h-4 w-4">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 21h5v-5" />
                    </svg>
                    刷新
                </Button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Create New Strategy Card -->
                <Card
                    class="flex flex-col justify-center items-center border-dashed border-2 cursor-pointer hover:bg-slate-50 transition-colors h-full min-h-[200px]"
                    @click="emit('create-strategy')">
                    <div class="flex flex-col items-center gap-2 text-slate-500">
                        <div class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <Plus class="h-6 w-6" />
                        </div>
                        <span class="font-medium">创建新策略</span>
                    </div>
                </Card>

                <!-- User Strategies -->
                <Card v-for="strategy in userStrategies" :key="strategy.id"
                    class="flex flex-col cursor-pointer hover:border-indigo-300 transition-all"
                    @click="emit('view-strategy', strategy.id)">
                    <CardHeader>
                        <div class="flex justify-between items-start">
                            <div class="space-y-1">
                                <CardTitle class="text-lg">{{ strategy.name }}</CardTitle>
                                <div class="flex gap-2">
                                    <Badge :variant="strategy.isPublic ? 'secondary' : 'outline'">
                                        {{ strategy.isPublic ? '公开' : '私有' }}
                                    </Badge>
                                    <Badge variant="outline" class="bg-slate-50">
                                        {{ strategy.triggerCount || 0 }} 规则
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <CardDescription class="line-clamp-2 h-10 mt-2">
                            {{ strategy.description || '暂无描述' }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="grow">
                        <div class="flex items-center gap-2 mt-2 mb-4">
                            <Avatar class="h-6 w-6">
                                <AvatarImage v-if="strategy.author?.photoUrl" :src="strategy.author.photoUrl"
                                    :alt="strategy.author?.displayName" />
                                <AvatarFallback class="text-xs bg-indigo-100 text-indigo-600">
                                    {{ (strategy.author?.displayName || strategy.author?.email ||
                                        'U').charAt(0).toUpperCase() }}
                                </AvatarFallback>
                            </Avatar>
                            <span class="text-xs text-slate-600 truncate max-w-[150px]" :title="strategy.author?.email">
                                {{ strategy.author?.displayName || strategy.author?.email || 'Unknown' }}
                            </span>
                        </div>
                        <div class="flex justify-between text-xs text-slate-400">
                            <span>更新于 {{ formatDate(strategy.updatedAt) }}</span>
                        </div>
                    </CardContent>
                    <CardFooter class="border-t pt-4 flex justify-between items-center text-sm text-slate-600">
                        <div class="flex gap-4">
                            <span class="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                    stroke-linejoin="round">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                {{ strategy.stats.views }}
                            </span>
                            <span class="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                    stroke-linejoin="round">
                                    <path
                                        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                </svg>
                                {{ strategy.stats.likes }}
                            </span>
                        </div>
                    </CardFooter>
                </Card>
            </div>

            <div class="border-t border-slate-200 my-8"></div>
        </div>

        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold tracking-tight">策略广场</h2>
            <div class="flex gap-2">
                <Button variant="outline" size="sm" :class="{ 'bg-slate-100': sortBy === 'recent' }"
                    @click="handleSortChange('recent')">
                    最新发布
                </Button>
                <Button variant="outline" size="sm" :class="{ 'bg-slate-100': sortBy === 'popular' }"
                    @click="handleSortChange('popular')">
                    最受欢迎
                </Button>
            </div>
        </div>

        <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="h-64 bg-slate-100 rounded-lg animate-pulse"></div>
        </div>

        <div v-else-if="publicStrategies.length === 0" class="text-center py-12 text-slate-500">
            暂无公开策略，快来分享你的第一个策略吧！
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card v-for="strategy in publicStrategies" :key="strategy.id"
                class="flex flex-col cursor-pointer hover:border-indigo-300 transition-all"
                @click="emit('view-strategy', strategy.id)">
                <CardHeader>
                    <div class="flex justify-between items-start">
                        <div class="space-y-1">
                            <CardTitle class="text-lg">{{ strategy.name }}</CardTitle>
                            <div class="flex gap-2">
                                <Badge variant="secondary" v-if="strategy.isPublic">公开</Badge>
                                <Badge variant="outline" class="bg-slate-50">
                                    {{ strategy.triggerCount || 0 }} 规则
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <CardDescription class="line-clamp-2 h-10 mt-2">
                        {{ strategy.description || '暂无描述' }}
                    </CardDescription>
                </CardHeader>
                <CardContent class="grow">
                    <div class="flex items-center gap-2 mt-2 mb-4">
                        <Avatar class="h-6 w-6">
                            <AvatarImage v-if="strategy.author?.photoUrl" :src="strategy.author.photoUrl"
                                :alt="strategy.author?.displayName" />
                            <AvatarFallback class="text-xs bg-indigo-100 text-indigo-600">
                                {{ (strategy.author?.displayName || strategy.author?.email ||
                                'U').charAt(0).toUpperCase() }}
                            </AvatarFallback>
                        </Avatar>
                        <span class="text-xs text-slate-600 truncate max-w-[150px]" :title="strategy.author?.email">
                            {{ strategy.author?.displayName || strategy.author?.email || 'Unknown' }}
                        </span>
                    </div>
                    <div class="flex justify-between text-xs text-slate-400">
                        <span>更新于 {{ formatDate(strategy.updatedAt) }}</span>
                    </div>
                </CardContent>
                <CardFooter class="border-t pt-4 flex justify-between items-center text-sm text-slate-600">
                    <div class="flex gap-4">
                        <span class="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            {{ strategy.stats.views }}
                        </span>
                        <button @click.stop="handleLike(strategy.id)"
                            class="flex items-center gap-1 hover:text-red-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path
                                    d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                            </svg>
                            {{ strategy.stats.likes }}
                        </button>
                        <button @click.stop="openComments(strategy.id)"
                            class="flex items-center gap-1 hover:text-blue-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            评论
                        </button>
                    </div>
                </CardFooter>
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
                            <AvatarFallback>{{ comment.user_email?.charAt(0).toUpperCase() || 'U' }}</AvatarFallback>
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
</template>
