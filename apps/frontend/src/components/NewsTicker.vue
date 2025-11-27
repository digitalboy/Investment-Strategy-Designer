<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useNewsStore } from '@/stores/news'
import { storeToRefs } from 'pinia'
import { Loader2 } from 'lucide-vue-next'
import NewsDetailDialog from './NewsDetailDialog.vue'
import type { NewsArticle } from '@/services/newsService'

const store = useNewsStore()
const { news, isLoading } = storeToRefs(store)

const showDetail = ref(false)
const selectedArticle = ref<NewsArticle | null>(null)

// Polling interval (e.g., every 5 minutes)
let pollTimer: number

onMounted(async () => {
    // Initial fetch
    await store.fetchNews()
    
    // Setup polling
    pollTimer = setInterval(() => {
        store.fetchNews()
    }, 5 * 60 * 1000)
})

onUnmounted(() => {
    clearInterval(pollTimer)
})

const handleArticleClick = (article: NewsArticle) => {
    selectedArticle.value = article
    showDetail.value = true
}

const formatTime = (publishedAt: any) => {
    if (!publishedAt) return ''
    
    let date: Date
    // Handle Firestore Timestamp
    if (typeof publishedAt === 'object' && '_seconds' in publishedAt) {
        const milliseconds = publishedAt._seconds * 1000 + Math.floor(publishedAt._nanoseconds / 1_000_000)
        date = new Date(milliseconds)
    } else {
        date = new Date(publishedAt)
    }

    if (isNaN(date.getTime())) return ''
    
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

// Duplicate content to ensure seamless loop
// We need enough content to fill the screen width plus some buffer
const scrollingContent = computed(() => {
    if (news.value.length === 0) return []
    // Repeat the list enough times to ensure smooth infinite scroll
    // 3 times is usually safe for CSS scrolling
    return [...news.value, ...news.value, ...news.value] 
})

</script>

<template>
    <div class="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-sm text-white h-10 flex items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-slate-700 overflow-hidden group">
        <!-- Label Badge -->
        <div class="bg-emerald-600 h-full px-4 flex items-center justify-center z-10 shrink-0 font-bold text-xs tracking-widest uppercase shadow-md">
            <span v-if="isLoading" class="animate-spin mr-2"><Loader2 class="w-3 h-3" /></span>
            <span>NEWS</span>
        </div>

        <!-- Scrolling Container -->
        <div class="flex-1 overflow-hidden relative h-full flex items-center">
            <!-- Ticker Track -->
            <div class="flex items-center whitespace-nowrap animate-ticker hover:pause-animation pl-4">
                <div v-for="(article, index) in scrollingContent" :key="`${article.id}-${index}`" 
                    class="flex items-center shrink-0 mr-12 cursor-pointer transition-colors hover:text-emerald-400"
                    @click="handleArticleClick(article)">
                    
                    <span class="text-emerald-500 mr-2 text-[10px] font-mono uppercase border border-emerald-500/30 px-1.5 rounded">
                        {{ article.topic }}
                    </span>
                    <span class="text-sm font-medium">{{ article.title }}</span>
                    <span class="text-slate-500 mx-2 text-xs">|</span>
                    <span class="text-xs text-slate-400">{{ formatTime(article.publishedAt) }}</span>
                </div>
            </div>
        </div>

        <!-- Detail Dialog -->
        <NewsDetailDialog v-model:open="showDetail" :article="selectedArticle" />
    </div>
</template>

<style scoped>
@keyframes ticker {
    0% {
        transform: translateX(0);
    }
    100% {
        transform: translateX(-33.33%); /* Move 1/3 because we tripled the content */
    }
}

.animate-ticker {
    animation: ticker 60s linear infinite; /* Adjust speed as needed */
}

.hover\:pause-animation:hover {
    animation-play-state: paused;
}
</style>
