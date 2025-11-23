<script setup lang="ts">
import { ref, computed } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { MessageSquare, CornerDownRight } from 'lucide-vue-next'

export interface Comment {
    id: string
    user_email?: string
    user_name?: string
    user_photo?: string
    content: string
    created_at: string
    parent_id?: string | null
    replies?: Comment[]
}

const props = defineProps<{
    comment: Comment
    depth?: number
}>()

const emit = defineEmits<{
    'reply': [parentId: string, content: string]
}>()

const isReplying = ref(false)
const replyContent = ref('')
const currentDepth = computed(() => props.depth || 0)

const toggleReply = () => {
    isReplying.value = !isReplying.value
    if (!isReplying.value) replyContent.value = ''
}

const submitReply = () => {
    if (!replyContent.value.trim()) return
    // Emit event with (parentId, content)
    emit('reply', props.comment.id, replyContent.value)
    isReplying.value = false
    replyContent.value = ''
}

// Handle recursive reply events
const onRecursiveReply = (parentId: string, content: string) => {
    emit('reply', parentId, content)
}
</script>

<template>
    <div class="flex gap-3" :class="{ 'mt-4': currentDepth > 0 }">
        <Avatar class="h-8 w-8 border-2 border-indigo-200/50 shadow-sm shrink-0">
            <AvatarImage v-if="comment.user_photo" :src="comment.user_photo" :alt="comment.user_name || comment.user_email" />
            <AvatarFallback class="bg-linear-to-br from-indigo-500 to-blue-500 text-white font-bold text-xs">
                {{ (comment.user_name || comment.user_email || 'U').charAt(0).toUpperCase() }}
            </AvatarFallback>
        </Avatar>
        
        <div class="grow space-y-2">
            <div class="bg-linear-to-br from-white via-blue-50/40 to-indigo-50/30 p-3 rounded-xl border border-indigo-200/40 shadow-sm hover:shadow-md hover:shadow-indigo-500/10 transition-all">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-semibold text-slate-700">
                        {{ comment.user_name || comment.user_email || '匿名用户' }}
                    </span>
                    <span class="text-xs text-slate-400">{{ formatDate(comment.created_at) }}</span>
                </div>
                <p class="text-sm text-slate-800 leading-relaxed">{{ comment.content }}</p>
                
                <!-- Actions -->
                <div class="mt-2 flex items-center gap-2">
                    <button 
                        @click="toggleReply"
                        class="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                        <MessageSquare class="h-3 w-3" />
                        {{ isReplying ? '取消' : '回复' }}
                    </button>
                </div>
            </div>

            <!-- Reply Input -->
            <div v-if="isReplying" class="flex gap-2 items-center pl-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <CornerDownRight class="h-4 w-4 text-indigo-300 shrink-0" />
                <Input 
                    v-model="replyContent" 
                    placeholder="回复评论..." 
                    class="h-9 text-sm bg-white/80"
                    @keyup.enter="submitReply"
                    auto-focus
                />
                <Button size="sm" @click="submitReply" :disabled="!replyContent.trim()" class="h-9 px-3">
                    发送
                </Button>
            </div>

            <!-- Nested Replies -->
            <div v-if="comment.replies && comment.replies.length > 0" class="pl-4 border-l-2 border-indigo-100/50">
                <CommentItem 
                    v-for="reply in comment.replies" 
                    :key="reply.id" 
                    :comment="reply" 
                    :depth="currentDepth + 1"
                    @reply="onRecursiveReply"
                />
            </div>
        </div>
    </div>
</template>