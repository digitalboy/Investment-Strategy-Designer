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
    const commentsPage = ref(1)
    const commentsLimit = ref(20)
    const hasMoreComments = ref(true)
    const commentsLoading = ref(false)

    // Metadata for the currently loaded strategy (if any)
    const currentStrategyMetadata = ref<{ id: string; userId: string; isPublic: boolean; isOwner: boolean; name?: string } | null>(null)
    const currentStrategyName = ref('')

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

    const updateTrigger = (index: number, trigger: Trigger) => {
        if (index < 0 || index >= config.value.triggers.length) return
        config.value.triggers[index] = trigger
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
            // Ensure we have backtest results before saving to include performance metrics
            if (!backtestResult.value) {
                console.log('No backtest result found, running auto-backtest before saving...')
                await runBacktest()
                // Restore loading state as runBacktest sets it to false
                isLoading.value = true

                if (error.value) {
                    throw new Error('Cannot save: Auto-backtest failed')
                }
            }

            const headers = {
                'Authorization': `Bearer ${token}`
            }

            const payload: any = {
                name,
                description,
                config: config.value,
                isPublic
            }

            // Attach performance metrics if available from the latest backtest
            if (backtestResult.value?.performance?.strategy) {
                console.log('Attaching metrics to save payload:', backtestResult.value.performance.strategy)
                payload.returnRate = backtestResult.value.performance.strategy.annualizedReturn
                payload.maxDrawdown = backtestResult.value.performance.strategy.maxDrawdown
            } else {
                console.warn('Backtest result exists but strategy performance metrics are missing', backtestResult.value)
            }

            await axios.post(
                `${API_BASE_URL}/strategies`,
                payload,
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

    interface UpdateStrategyOptions {
        id: string | { id: string }
        name?: string
        isPublic?: boolean
        withConfig?: boolean
        skipBacktest?: boolean
    }

    const resolveStrategyId = (identifier: UpdateStrategyOptions['id']): string => {
        if (typeof identifier === 'string') {
            return identifier
        }
        if (identifier && typeof identifier === 'object' && typeof identifier.id === 'string') {
            return identifier.id
        }
        throw new Error('Invalid strategy identifier')
    }

    const updateStrategy = async (options: UpdateStrategyOptions) => {
        console.log('updateStrategy called with options:', options)
        const { name, isPublic, withConfig = true, skipBacktest = false } = options
        const id = resolveStrategyId(options.id)
        console.log('Resolved strategy ID:', id, 'Type:', typeof id)
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()

        const token = await authStore.getFreshToken()

        if (!token) {
            error.value = 'User must be logged in to update strategy'
            isLoading.value = false
            throw new Error('User must be logged in to update strategy')
        }

        try {
            // Ensure we have backtest results before saving to include performance metrics when not skipped
            if (!skipBacktest && !backtestResult.value) {
                console.log('No backtest result found, running auto-backtest before updating...')
                await runBacktest()
                // Restore loading state as runBacktest sets it to false
                isLoading.value = true

                if (error.value) {
                    throw new Error('Cannot update: Auto-backtest failed')
                }
            }

            const headers = {
                'Authorization': `Bearer ${token}`
            }

            const payload: Record<string, unknown> = {}

            if (withConfig) {
                payload.config = {
                    ...config.value,
                    triggers: [...config.value.triggers]
                }
            }

            if (typeof name === 'string') {
                payload.name = name
            }

            if (typeof isPublic === 'boolean') {
                payload.isPublic = isPublic
            }

            // Attach performance metrics if available from the latest backtest
            if (backtestResult.value?.performance?.strategy) {
                console.log('Attaching metrics to update payload:', backtestResult.value.performance.strategy)
                payload.returnRate = backtestResult.value.performance.strategy.annualizedReturn
                payload.maxDrawdown = backtestResult.value.performance.strategy.maxDrawdown
            }

            console.log('Final update payload:', JSON.stringify(payload, null, 2))
            console.log('Strategy ID for URL:', id, typeof id)

            const response = await axios.put(
                `${API_BASE_URL}/strategies/${id}`,
                payload,
                { headers }
            )

            const resolvedName = response.data?.name ?? (typeof name === 'string' ? name : undefined)

            if (resolvedName) {
                currentStrategyName.value = resolvedName
            }

            if (currentStrategyMetadata.value) {
                currentStrategyMetadata.value = {
                    ...currentStrategyMetadata.value,
                    name: resolvedName || currentStrategyMetadata.value.name,
                    isPublic: typeof isPublic === 'boolean' ? isPublic : currentStrategyMetadata.value.isPublic
                }
            }
        } catch (e: any) {
            error.value = e.message || 'Failed to update strategy'
            console.error(e)
            throw e
        } finally {
            isLoading.value = false
        }
    }

    const deleteStrategy = async (id: string) => {
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()

        const token = await authStore.getFreshToken()

        if (!token) {
            error.value = 'User must be logged in to delete strategy'
            isLoading.value = false
            throw new Error('User must be logged in to delete strategy')
        }

        try {
            await axios.delete(
                `${API_BASE_URL}/strategies/${id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )

            if (currentStrategyMetadata.value?.id === id) {
                reset()
            }
        } catch (e: any) {
            error.value = e.message || 'Failed to delete strategy'
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
        commentsPage.value = 1
        hasMoreComments.value = true
        currentStrategyComments.value = []
        commentsLoading.value = true

        console.log('📖 fetchComments: strategyId =', strategyId, 'page = 1')

        try {
            const response = await axios.get(`${API_BASE_URL}/strategies/${strategyId}/comments`, {
                params: { page: 1, limit: commentsLimit.value }
            })
            currentStrategyComments.value = response.data

            console.log('✅ Fetched', response.data.length, 'comments, limit =', commentsLimit.value)

            // If we got fewer comments than limit, it means we reached the end
            // Note: This is an approximation because the response includes replies.
            // However, since we paginate on roots, checking result count vs limit isn't 100% accurate 
            // for "has more roots", but if we got 0 results, we definitely have no more.
            // A better way would be if backend returned metadata. 
            // For now, if result is empty, stop.
            if (response.data.length === 0 || response.data.length < commentsLimit.value) {
                hasMoreComments.value = false
                console.log('🛑 No more comments available (got', response.data.length, ')')
            } else {
                console.log('➕ More comments may be available')
            }
        } catch (e) {
            console.error('Failed to fetch comments', e)
        } finally {
            commentsLoading.value = false
        }
    }

    const loadMoreComments = async (strategyId: string) => {
        console.log('🔍 loadMoreComments called: hasMore =', hasMoreComments.value, 'loading =', commentsLoading.value)

        if (!hasMoreComments.value || commentsLoading.value) {
            console.log('⏸️ Skipping loadMore: hasMore =', hasMoreComments.value, 'loading =', commentsLoading.value)
            return
        }

        commentsLoading.value = true
        const nextPage = commentsPage.value + 1

        console.log('📖 Loading page', nextPage, 'for strategy', strategyId)

        try {
            const response = await axios.get(`${API_BASE_URL}/strategies/${strategyId}/comments`, {
                params: { page: nextPage, limit: commentsLimit.value }
            })

            console.log('✅ Loaded page', nextPage, ':', response.data.length, 'comments')

            if (response.data.length === 0 || response.data.length < commentsLimit.value) {
                hasMoreComments.value = false
                console.log('🛑 No more comments available')
            }

            if (response.data.length > 0) {
                currentStrategyComments.value.push(...response.data)
                commentsPage.value = nextPage
                console.log('📝 Total comments now:', currentStrategyComments.value.length)
            }
        } catch (e) {
            console.error('Failed to load more comments', e)
        } finally {
            commentsLoading.value = false
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
                let loadedConfig = response.data.config

                // Handle potential double-stringified config
                if (typeof loadedConfig === 'string') {
                    try {
                        loadedConfig = JSON.parse(loadedConfig)
                    } catch (e) {
                        console.error('Failed to parse config string', e)
                    }
                }

                // Ensure triggers array exists
                if (!loadedConfig.triggers) {
                    loadedConfig.triggers = []
                }

                config.value = loadedConfig
                console.log('Loaded strategy config:', config.value)
            }

            // Store metadata
            if (response.data) {
                currentStrategyName.value = response.data.name || response.data.title || ''
                currentStrategyMetadata.value = {
                    id: response.data.id,
                    userId: response.data.user_id || response.data.userId, // Handle potential casing diffs
                    isPublic: response.data.isPublic || response.data.is_public,
                    isOwner: !!response.data.isOwner,
                    name: response.data.name || response.data.title
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

    const addComment = async (strategyId: string, content: string, parentId?: string) => {
        const authStore = useAuthStore()
        const token = await authStore.getFreshToken()

        if (!token) throw new Error('Must be logged in to comment')

        try {
            const response = await axios.post(
                `${API_BASE_URL}/strategies/${strategyId}/comments`,
                { content, parentId },
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
        currentStrategyName.value = ''
    }

    return {
        config,
        backtestResult,
        isLoading,
        error,
        publicStrategies,
        userStrategies,
        currentStrategyComments,
        commentsPage,
        hasMoreComments,
        commentsLoading,
        currentStrategyMetadata,
        currentStrategyName,
        setConfig,
        addTrigger,
        removeTrigger,
        updateTrigger,
        runBacktest,
        saveStrategy,
        updateStrategy,
        deleteStrategy,
        fetchPublicStrategies,
        fetchUserStrategies,
        toggleLike,
        fetchComments,
        loadMoreComments,
        loadStrategy,
        addComment,
        reset
    }
})
