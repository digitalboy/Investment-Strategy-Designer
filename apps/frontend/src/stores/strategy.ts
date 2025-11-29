import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StrategyConfig, Trigger, BacktestResultDTO, StrategySummaryDTO, CommentEntity } from '@/types'
import { useAuthStore } from './auth'
import { strategyService } from '@/services/strategyService'

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
    const currentStrategyMetadata = ref<{ id: string; userId: string; isPublic: boolean; notificationsEnabled: boolean; isOwner: boolean; name?: string } | null>(null)
    const currentStrategyName = ref('')
    const currentStrategyDescription = ref('')

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

    const runBacktest = async (dcaAcceleration?: number) => { // Allow passing dcaAcceleration as a direct argument
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()

        try {
            const payload = {
                ...config.value,
                // If dcaAcceleration is passed, use it, otherwise don't include it in payload
                ...(dcaAcceleration !== undefined && { dcaAcceleration })
            };
            const result = await strategyService.runBacktest(payload, authStore.token)

            // Normalize response data to handle potential structure mismatch
            // Note: Using 'any' to bypass strict type check on raw API response for normalization check
            const rawResult = result as any
            if (rawResult.performance && !rawResult.performance.strategy && typeof rawResult.performance.totalReturn === 'number') {
                console.warn('Received flat performance structure, normalizing...')
                rawResult.performance = {
                    strategy: {
                        totalReturn: rawResult.performance.totalReturn,
                        annualizedReturn: rawResult.performance.cagr || rawResult.performance.annualizedReturn || 0,
                        maxDrawdown: rawResult.performance.maxDrawdown,
                        sharpeRatio: rawResult.performance.sharpeRatio
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

            const payload: any = {
                name,
                description,
                config: config.value,
                isPublic,
                notificationsEnabled: true // Default to true for new strategies
            }

            // Attach performance metrics if available from the latest backtest
            if (backtestResult.value?.performance?.strategy) {
                console.log('Attaching metrics to save payload:', backtestResult.value.performance.strategy)
                payload.returnRate = backtestResult.value.performance.strategy.annualizedReturn
                payload.maxDrawdown = backtestResult.value.performance.strategy.maxDrawdown
            } else {
                console.warn('Backtest result exists but strategy performance metrics are missing', backtestResult.value)
            }

            await strategyService.createStrategy(payload, token)
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
        notificationsEnabled?: boolean
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
        const { name, isPublic, notificationsEnabled, withConfig = true, skipBacktest = false } = options
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

            if (typeof notificationsEnabled === 'boolean') {
                payload.notificationsEnabled = notificationsEnabled
            }

            // Attach performance metrics if available from the latest backtest
            if (backtestResult.value?.performance?.strategy) {
                console.log('Attaching metrics to update payload:', backtestResult.value.performance.strategy)
                payload.returnRate = backtestResult.value.performance.strategy.annualizedReturn
                payload.maxDrawdown = backtestResult.value.performance.strategy.maxDrawdown
            }

            console.log('Final update payload:', JSON.stringify(payload, null, 2))
            console.log('Strategy ID for URL:', id, typeof id)

            const responseData = await strategyService.updateStrategy(id, payload, token)

            const resolvedName = responseData?.name ?? (typeof name === 'string' ? name : undefined)

            if (resolvedName) {
                currentStrategyName.value = resolvedName
            }

            if (currentStrategyMetadata.value) {
                currentStrategyMetadata.value = {
                    ...currentStrategyMetadata.value,
                    name: resolvedName || currentStrategyMetadata.value.name,
                    isPublic: typeof isPublic === 'boolean' ? isPublic : currentStrategyMetadata.value.isPublic,
                    notificationsEnabled: typeof notificationsEnabled === 'boolean' ? notificationsEnabled : currentStrategyMetadata.value.notificationsEnabled
                }
            } else {
                // For new strategies (no metadata yet), we might want to init defaults if we were creating metadata here,
                // but createStrategy happens via saveStrategy which reloads or sets metadata.
                // Actually, saveStrategy doesn't set metadata directly, it usually re-fetches or lets UI handle it.
                // But let's ensure saveStrategy sets the default if it constructs payload.
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
            await strategyService.deleteStrategy(id, token)

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
            publicStrategies.value = await strategyService.getPublicStrategies(sortBy)
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
            userStrategies.value = await strategyService.getUserStrategies(token)
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
            await strategyService.toggleLike(strategyId, token)
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
            const comments = await strategyService.getComments(strategyId, 1, commentsLimit.value)
            currentStrategyComments.value = comments

            console.log('✅ Fetched', comments.length, 'comments, limit =', commentsLimit.value)

            // If we got fewer comments than limit, it means we reached the end
            if (comments.length === 0 || comments.length < commentsLimit.value) {
                hasMoreComments.value = false
                console.log('🛑 No more comments available (got', comments.length, ')')
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
            const comments = await strategyService.getComments(strategyId, nextPage, commentsLimit.value)

            console.log('✅ Loaded page', nextPage, ':', comments.length, 'comments')

            if (comments.length === 0 || comments.length < commentsLimit.value) {
                hasMoreComments.value = false
                console.log('🛑 No more comments available')
            }

            if (comments.length > 0) {
                currentStrategyComments.value.push(...comments)
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
            const token = await authStore.getFreshToken()
            const data = await strategyService.getStrategy(strategyId, token)

            // Update config with the loaded strategy's config
            if (data && data.config) {
                let loadedConfig = data.config

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
            if (data) {
                currentStrategyName.value = data.name || data.title || ''
                currentStrategyMetadata.value = {
                    id: data.id,
                    userId: data.user_id || data.userId, // Handle potential casing diffs
                    isPublic: data.isPublic || data.is_public,
                    notificationsEnabled: !!data.notificationsEnabled, // New field
                    isOwner: !!data.isOwner,
                    name: data.name || data.title
                }
            }

            return data
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
            const newComment = await strategyService.addComment(strategyId, content, parentId, token)
            currentStrategyComments.value.unshift(newComment)
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
        currentStrategyDescription.value = ''
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
        currentStrategyDescription, // Add this
        setConfig, addTrigger,
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
