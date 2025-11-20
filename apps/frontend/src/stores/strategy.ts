import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StrategyConfig, Trigger, BacktestResultDTO, StrategySummaryDTO, CommentEntity } from '@/types'
import axios from 'axios'
import { useAuthStore } from './auth'

const API_BASE_URL = 'https://investment-strategy-designer-backend.digitalboyzone.workers.dev/api/v1'

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
    const currentStrategyComments = ref<CommentEntity[]>([])

    // Actions
    const setConfig = (newConfig: Partial<StrategyConfig>) => {
        config.value = { ...config.value, ...newConfig }
    }

    const addTrigger = (trigger: Trigger) => {
        config.value.triggers = [...config.value.triggers, trigger]
    }

    const removeTrigger = (index: number) => {
        const newTriggers = [...config.value.triggers]
        newTriggers.splice(index, 1)
        config.value.triggers = newTriggers
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
            backtestResult.value = response.data
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
    }

    return {
        config,
        backtestResult,
        isLoading,
        error,
        publicStrategies,
        currentStrategyComments,
        setConfig,
        addTrigger,
        removeTrigger,
        runBacktest,
        saveStrategy,
        fetchPublicStrategies,
        toggleLike,
        fetchComments,
        addComment,
        reset
    }
})
