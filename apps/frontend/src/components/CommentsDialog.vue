<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-vue-next'
import CommentItem, { type Comment } from '@/components/CommentItem.vue'

const props = defineProps<{
    open: boolean
    comments: Comment[]
    title?: string
    description?: string
    loading?: boolean
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    'add-comment': [content: string, parentId?: string]
}>()

const newComment = ref('')

// Handle top-level comment
const handleAddComment = () => {
    if (!newComment.value.trim()) return
    // Only content is needed for top-level
    emit('add-comment', newComment.value)
    newComment.value = ''
}

// Handle reply from CommentItem
// parentId comes first from CommentItem event, content second
const handleReply = (parentId: string, content: string) => {
    // Emit up with content first, then parentId
    emit('add-comment', content, parentId)
}

const commentTree = computed(() => {
    const map = new Map<string, Comment>()
    const roots: Comment[] = []

    // Deep copy and initialize map to avoid mutating props directly
    // and prepare for tree building
    props.comments.forEach(c => {
        // Ensure replies array exists
        map.set(c.id, { ...c, replies: [] })
    })

    // Build tree
    props.comments.forEach(c => {
        const comment = map.get(c.id)!
        if (c.parent_id && map.has(c.parent_id)) {
            map.get(c.parent_id)!.replies!.push(comment)
        } else {
            roots.push(comment)
        }
    })

    // Sort recursive function
    const sortReplies = (nodes: Comment[]) => {
        nodes.forEach(node => {
            if (node.replies && node.replies.length > 0) {
                // Chronological order for replies (oldest first)
                node.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                sortReplies(node.replies)
            }
        })
    }
    
    // Process roots
    sortReplies(roots)
    // Roots are typically Newest First (default from backend usually)
    // If we want to ensure it:
    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return roots
})
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent
            class="sm:max-w-[600px] max-h-[80vh] flex flex-col rounded-2xl border-indigo-200/40 shadow-2xl shadow-indigo-500/20 bg-white">
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

                <!-- Comments Tree -->
                <div v-else class="space-y-4">
                    <CommentItem 
                        v-for="comment in commentTree" 
                        :key="comment.id" 
                        :comment="comment" 
                        @reply="handleReply"
                    />
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