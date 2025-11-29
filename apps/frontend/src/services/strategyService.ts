import axios from '@/lib/api'
import type { StrategyConfig, BacktestResultDTO, StrategySummaryDTO, CommentEntity } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://investment-strategy-designer-backend.digitalboyzone.workers.dev/api/v1'

export const strategyService = {
    async runBacktest(config: StrategyConfig, token?: string | null, dcaAcceleration?: number): Promise<BacktestResultDTO> {
        const headers: Record<string, string> = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        const payload: any = { ...config };
        if (dcaAcceleration !== undefined) {
            payload.dcaAcceleration = dcaAcceleration;
        }

        const response = await axios.post(
            `${API_BASE_URL}/backtest`,
            payload,
            { headers }
        )
        return response.data
    },

    async createStrategy(payload: any, token: string): Promise<void> {
        await axios.post(
            `${API_BASE_URL}/strategies`,
            payload,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
    },

    async getPublicStrategies(sortBy: 'recent' | 'popular' | 'return' = 'recent'): Promise<StrategySummaryDTO[]> {
        const response = await axios.get(`${API_BASE_URL}/strategies?scope=public&sort=${sortBy}`)
        return response.data
    },

    async getUserStrategies(token: string): Promise<StrategySummaryDTO[]> {
        const response = await axios.get(
            `${API_BASE_URL}/strategies?scope=mine`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
        return response.data
    },

    async getStrategy(id: string, token?: string | null): Promise<any> {
        const headers: Record<string, string> = {}
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
        const response = await axios.get(
            `${API_BASE_URL}/strategies/${id}`,
            { headers }
        )
        return response.data
    },

    async updateStrategy(id: string, payload: any, token: string): Promise<any> {
        const response = await axios.put(
            `${API_BASE_URL}/strategies/${id}`,
            payload,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
        return response.data
    },

    async deleteStrategy(id: string, token: string): Promise<void> {
        await axios.delete(
            `${API_BASE_URL}/strategies/${id}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
    },

    async toggleLike(id: string, token: string): Promise<void> {
        await axios.post(
            `${API_BASE_URL}/strategies/${id}/like`,
            {},
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
    },

    async getComments(id: string, page: number, limit: number): Promise<CommentEntity[]> {
        const response = await axios.get(`${API_BASE_URL}/strategies/${id}/comments`, {
            params: { page, limit }
        })
        return response.data
    },

    async addComment(id: string, content: string, parentId: string | undefined, token: string): Promise<CommentEntity> {
        const response = await axios.post(
            `${API_BASE_URL}/strategies/${id}/comments`,
            { content, parentId },
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
        return response.data
    }
}
