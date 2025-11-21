import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StrategyConfig, Trigger, BacktestResultDTO, StrategySummaryDTO, CommentEntity } from '@/types'
import axios from 'axios'
import { useAuthStore } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://investment-strategy-designer-backend.digitalboyzone.workers.dev/api/v1'

export const useStrategyStore = defineStore('strategy', () => {
    // State
    const config = ref<StrategyConfig>({
        etfSymbol: '',
        startDate: '',
        endDate: '',
        initialCapital: 10000,
        triggers: []
    })

    const backtestResult = ref<BacktestResultDTO | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // Community State
    const publicStrategies = ref<StrategySummaryDTO[]>([])
    const userStrategies = ref<StrategySummaryDTO[]>([])
    const currentStrategyComments = ref<CommentEntity[]>([])

    // Metadata for the currently loaded strategy (if any)
    const currentStrategyMetadata = ref<{ id: string; userId: string; isPublic: boolean; isOwner: boolean } | null>(null)

    // Actions
    const setConfig = (newConfig: Partial<StrategyConfig>) => {
        config.value = { ...config.value, ...newConfig }
    }

    const addTrigger = (trigger: Trigger) => {
        // Use push to ensure deep reactivity triggers correctly
        config.value.triggers.push(trigger)
    }

    const removeTrigger = (index: number) => {
        config.value.triggers.splice(index, 1)
    }

    const runBacktest = async () => {
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()

        try {
            const headers: Record<string, string> = {}
            if (authStore.token) {
                headers['Authorization'] = `Bearer ${authStore.token}`
            }

            const response = await axios.post(
                `${API_BASE_URL}/backtest`,
                config.value,
                { headers }
            )

            // Normalize response data to handle potential structure mismatch
            const result = response.data
            if (result.performance && !result.performance.strategy && typeof result.performance.totalReturn === 'number') {
                console.warn('Received flat performance structure, normalizing...')
                result.performance = {
                    strategy: {
                        totalReturn: result.performance.totalReturn,
                        annualizedReturn: result.performance.cagr || result.performance.annualizedReturn || 0,
                        maxDrawdown: result.performance.maxDrawdown,
                        sharpeRatio: result.performance.sharpeRatio
                    },
                    benchmark: {
                        totalReturn: 0,
                        annualizedReturn: 0,
                        maxDrawdown: 0,
                        sharpeRatio: 0
                    }
                }
            }

            backtestResult.value = result
        } catch (e: any) {
            error.value = e.message || 'Backtest failed'
            console.error(e)
        } finally {
            isLoading.value = false
        }
    }

    const saveStrategy = async (name: string, description: string, isPublic: boolean = false) => {
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()

        const token = await authStore.getFreshToken()

        if (!token) {
            error.value = 'User must be logged in to save strategy'
            isLoading.value = false
            throw new Error('User must be logged in to save strategy')
        }

        try {
            const headers = {
                'Authorization': `Bearer ${token}`
            }

            await axios.post(
                `${API_BASE_URL}/strategies`,
                {
                    name,
                    description,
                    config: config.value,
                    isPublic
                },
                { headers }
            )
        } catch (e: any) {
            error.value = e.message || 'Failed to save strategy'
            console.error(e)
            throw e
        } finally {
            isLoading.value = false
        }
    }

    const fetchPublicStrategies = async (sortBy: 'recent' | 'popular' | 'return' = 'recent') => {
        isLoading.value = true
        error.value = null

        try {
            const response = await axios.get(`${API_BASE_URL}/strategies?scope=public&sort=${sortBy}`)
            publicStrategies.value = response.data
        } catch (e: any) {
            error.value = e.message || 'Failed to fetch public strategies'
            console.error(e)
        } finally {
            isLoading.value = false
        }
    }

    const fetchUserStrategies = async () => {
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()
        const token = await authStore.getFreshToken()

        if (!token) return

        try {
            const response = await axios.get(
                `${API_BASE_URL}/strategies?scope=mine`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            userStrategies.value = response.data
        } catch (e: any) {
            error.value = e.message || 'Failed to fetch user strategies'
            console.error(e)
        } finally {
            isLoading.value = false
        }
    }

    const toggleLike = async (strategyId: string) => {
        const authStore = useAuthStore()
        const token = await authStore.getFreshToken()

        if (!token) throw new Error('Must be logged in to like')

        try {
            await axios.post(
                `${API_BASE_URL}/strategies/${strategyId}/like`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            // Optimistically update UI or refetch
        } catch (e) {
            console.error('Failed to toggle like', e)
            throw e
        }
    }

    const fetchComments = async (strategyId: string) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/strategies/${strategyId}/comments`)
            currentStrategyComments.value = response.data
        } catch (e) {
            console.error('Failed to fetch comments', e)
        }
    }

    const loadStrategy = async (strategyId: string) => {
        console.log('Loading strategy:', strategyId)
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()

        try {
            const headers: Record<string, string> = {}
            const token = await authStore.getFreshToken()
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const response = await axios.get(
                `${API_BASE_URL}/strategies/${strategyId}`,
                { headers }
            )

            // Update config with the loaded strategy's config
            if (response.data && response.data.config) {
                config.value = response.data.config
            }

            // Store metadata
            if (response.data) {
                currentStrategyMetadata.value = {
                    id: response.data.id,
                    userId: response.data.user_id || response.data.userId, // Handle potential casing diffs
                    isPublic: response.data.isPublic || response.data.is_public,
                    isOwner: !!response.data.isOwner
                }
            }

            return response.data
        } catch (e: any) {
            error.value = e.message || 'Failed to load strategy'
            console.error(e)
            throw e
        } finally {
            isLoading.value = false
        }
    }

    const addComment = async (strategyId: string, content: string) => {
        const authStore = useAuthStore()
        const token = await authStore.getFreshToken()

        if (!token) throw new Error('Must be logged in to comment')

        try {
            const response = await axios.post(
                `${API_BASE_URL}/strategies/${strategyId}/comments`,
                { content },
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            currentStrategyComments.value.unshift(response.data)
        } catch (e) {
            console.error('Failed to add comment', e)
            throw e
        }
    }

    const reset = () => {
        config.value = {
            etfSymbol: '',
            startDate: '',
            endDate: '',
            initialCapital: 10000,
            triggers: []
        }
        backtestResult.value = null
        error.value = null
        currentStrategyMetadata.value = null
    }

    return {
        config,
        backtestResult,
        isLoading,
        error,
        publicStrategies,
        userStrategies,
        currentStrategyComments,
        currentStrategyMetadata,
        setConfig,
        addTrigger,
        removeTrigger,
        runBacktest,
        saveStrategy,
        fetchPublicStrategies,
        fetchUserStrategies,
        toggleLike,
        fetchComments,
        loadStrategy,
        addComment,
        reset
    }
})
