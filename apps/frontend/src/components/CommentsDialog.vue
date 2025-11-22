<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare } from 'lucide-vue-next'

export interface Comment {
    id: string
    user_email?: string
    content: string
    created_at: string
}

const props = defineProps<{
    open: boolean
    comments: Comment[]
    title?: string
    description?: string
    loading?: boolean
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    'add-comment': [content: string]
}>()

const newComment = ref('')

const handleAddComment = () => {
    if (!newComment.value.trim()) return
    emit('add-comment', newComment.value)
    newComment.value = ''
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
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent
            class="sm:max-w-[500px] max-h-[80vh] flex flex-col rounded-2xl border-indigo-200/40 shadow-2xl shadow-indigo-500/20 bg-white">
            <DialogHeader class="pb-4 border-b border-indigo-100">
                <DialogTitle
                    class="text-xl font-bold bg-linear-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    {{ title || '评论区' }}
                </DialogTitle>
                <DialogDescription class="text-slate-500">
                    {{ description || '查看和发表评论。' }}
                </DialogDescription>
            </DialogHeader>

            <div
                class="grow overflow-y-auto py-4 space-y-4 min-h-[200px] bg-linear-to-br from-slate-50/30 via-blue-50/20 to-indigo-50/30 -mx-6 px-6">
                <!-- Loading State -->
                <div v-if="loading" class="text-center text-slate-400 py-12">
                    <div class="flex flex-col items-center gap-3">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p class="text-sm text-slate-500">加载中...</p>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else-if="comments.length === 0" class="text-center text-slate-400 py-12">
                    <div class="flex flex-col items-center gap-3">
                        <div
                            class="p-4 bg-linear-to-br from-indigo-50 to-blue-50 rounded-full shadow-md shadow-indigo-500/20">
                            <MessageSquare class="h-8 w-8 text-indigo-400" />
                        </div>
                        <p class="text-base font-medium text-slate-500">暂无评论</p>
                        <p class="text-sm text-slate-400">快来抢沙发！</p>
                    </div>
                </div>

                <!-- Comments List -->
                <div v-else v-for="comment in comments" :key="comment.id" class="flex gap-3">
                    <Avatar class="h-9 w-9 border-2 border-indigo-200/50 shadow-sm">
                        <AvatarFallback
                            class="bg-linear-to-br from-indigo-500 to-blue-500 text-white font-bold text-sm">
                            {{ comment.user_email?.charAt(0).toUpperCase() || 'U' }}
                        </AvatarFallback>
                    </Avatar>
                    <div
                        class="bg-linear-to-br from-white via-blue-50/40 to-indigo-50/30 p-3.5 rounded-xl grow border border-indigo-200/40 shadow-sm hover:shadow-md hover:shadow-indigo-500/10 transition-all">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="text-xs font-semibold text-slate-700">
                                {{ comment.user_email || '匿名用户' }}
                            </span>
                            <span class="text-xs text-slate-400">{{ formatDate(comment.created_at) }}</span>
                        </div>
                        <p class="text-sm text-slate-800 leading-relaxed">{{ comment.content }}</p>
                    </div>
                </div>
            </div>

            <!-- Input Area -->
            <div
                class="border-t border-indigo-200/40 pt-4 mt-auto bg-linear-to-r from-blue-50/30 to-indigo-50/30 -mx-6 px-6 -mb-6 pb-6 rounded-b-2xl">
                <div class="flex gap-2">
                    <Input v-model="newComment" placeholder="写下你的想法..."
                        class="border-indigo-200/60 bg-white/80 backdrop-blur-sm focus:border-indigo-400 focus:ring-indigo-200 focus:bg-white transition-all"
                        @keyup.enter="handleAddComment" />
                    <Button @click="handleAddComment" :disabled="!newComment.trim()"
                        class="bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:shadow-none">
                        发送
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
