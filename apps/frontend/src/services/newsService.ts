import axios from 'axios'

const NEWS_API_BASE_URL = 'https://us-central1-beike-e6301.cloudfunctions.net/api'

export interface NewsArticle {
    id: string
    topic: string
    title: string
    summary: string
    url: string
    source: string
    publishedAt: string
    translations?: Record<string, { title: string; summary: string }>
}

export const newsService = {
    async getTopics(): Promise<string[]> {
        const response = await axios.get(`${NEWS_API_BASE_URL}/topics`)
        return response.data.topics
    },

    async getNewsByTopic(topic: string, lang?: string, page: number = 1, limit: number = 10): Promise<NewsArticle[]> {
        const response = await axios.get(`${NEWS_API_BASE_URL}/news/${topic}`, {
            params: {
                lang,
                page,
                limit
            }
        })
        return response.data.articles
    }
}
