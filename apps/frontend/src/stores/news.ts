import { defineStore } from 'pinia'
import { ref } from 'vue'
import { newsService, type NewsArticle } from '@/services/newsService'
import { useLanguageStore } from './language'

export const useNewsStore = defineStore('news', () => {
    const topics = ref<string[]>([])
    const news = ref<NewsArticle[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const fetchTopics = async () => {
        try {
            topics.value = await newsService.getTopics()
        } catch (e: any) {
            console.error('Failed to fetch topics:', e)
        }
    }

    const fetchNews = async (topic?: string) => {
        isLoading.value = true
        error.value = null
        const languageStore = useLanguageStore()
        // Use 'zh-CN' for Chinese, otherwise use English (or undefined to default to English)
        const lang = languageStore.currentLanguage === 'zh' ? 'zh-CN' : undefined

        try {
            // If a specific topic is requested, fetch only that
            if (topic) {
                const articles = await newsService.getNewsByTopic(topic, lang)
                news.value = articles
            } else {
                // Otherwise, fetch for all available topics (limited to first 5 to avoid too many requests)
                if (topics.value.length === 0) {
                    await fetchTopics()
                }
                
                if (topics.value.length > 0) {
                    // Fetch latest 3 news articles for each of the first 5 topics in parallel
                    const topicsToFetch = topics.value.slice(0, 5)
                    const results = await Promise.all(
                        topicsToFetch.map(t => newsService.getNewsByTopic(t, lang, 1, 3))
                    )
                    
                    // Interleave the results to mix topics
                    // e.g., [TopicA-1, TopicB-1, TopicC-1, TopicA-2, TopicB-2, ...]
                    const interleavedNews: NewsArticle[] = []
                    const maxLen = Math.max(...results.map(r => r.length))
                    
                    for (let i = 0; i < maxLen; i++) {
                        for (let j = 0; j < results.length; j++) {
                            const article = results[j]?.[i]; // Use optional chaining
                            if (article) { // Explicitly check if article is not undefined
                                interleavedNews.push(article);
                            }
                        }
                    }
                    
                    news.value = interleavedNews
                }
            }
        } catch (e: any) {
            error.value = e.message || 'Failed to fetch news'
            console.error(e)
        } finally {
            isLoading.value = false
        }
    }

    return {
        topics,
        news,
        isLoading,
        error,
        fetchTopics,
        fetchNews
    }
})
