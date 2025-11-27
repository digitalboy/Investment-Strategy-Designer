<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-vue-next'
import { useDateFormatter } from '@/lib/useDateFormatter'
import type { NewsArticle } from '@/services/newsService'

const props = defineProps<{
    open: boolean
    article: NewsArticle | null
}>()

const emit = defineEmits(['update:open'])

const { t } = useI18n({ useScope: 'global' })
const { formatDate } = useDateFormatter()

const formattedPublishedAt = computed(() => {
    if (!props.article?.publishedAt) return null;
    // Assuming publishedAt is { _seconds: number, _nanoseconds: number }
    const { _seconds, _nanoseconds } = props.article.publishedAt as unknown as { _seconds: number; _nanoseconds: number };
    if (_seconds === undefined || _nanoseconds === undefined) return props.article.publishedAt; // Fallback if format changes

    // Convert to milliseconds
    const milliseconds = _seconds * 1000 + Math.floor(_nanoseconds / 1_000_000);
    return new Date(milliseconds).toISOString(); // Convert to ISO string for formatDate
});

const openSource = () => {
    if (props.article?.url) {
        window.open(props.article.url, '_blank')
    }
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white rounded-xl shadow-2xl">
            <!-- Header with Source Badge -->
            <DialogHeader class="px-6 pt-6 pb-2 space-y-3">
                <div v-if="article" class="flex items-center gap-2 mb-1">
                    <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200">
                        {{ article.source }}
                    </span>
                    <span v-if="formattedPublishedAt" class="text-xs text-slate-400">{{ formatDate(formattedPublishedAt) }}</span>
                </div>
                <DialogTitle class="text-xl font-bold leading-snug text-slate-900">
                    {{ article?.title }}
                </DialogTitle>
            </DialogHeader>

            <!-- Content -->
            <div class="px-6 py-4">
                <DialogDescription class="text-sm text-slate-600 leading-relaxed">
                    {{ article?.summary }}
                </DialogDescription>
            </div>

            <!-- Footer -->
            <DialogFooter class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex sm:justify-between items-center">
                <span class="text-[10px] text-slate-400">Topic: #{{ article?.topic }}</span>
                <div class="flex gap-2">
                    <Button variant="outline" size="sm" @click="$emit('update:open', false)">
                        {{ t('common.back') }}
                    </Button>
                    <Button size="sm" class="bg-slate-900 text-white hover:bg-slate-800" @click="openSource">
                        {{ t('common.view') }} Source
                        <ExternalLink class="w-3 h-3 ml-2" />
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
