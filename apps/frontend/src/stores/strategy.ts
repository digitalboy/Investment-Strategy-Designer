import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StrategyConfig, Trigger, BacktestResultDTO } from '@/types'
import axios from 'axios'
import { useAuthStore } from './auth'

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

    // Actions
    const setConfig = (newConfig: Partial<StrategyConfig>) => {
        config.value = { ...config.value, ...newConfig }
    }

    const addTrigger = (trigger: Trigger) => {
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

            // Assuming the backend is running on localhost:8787
            // In production, this should be configured via environment variables
            const response = await axios.post(
                'https://investment-strategy-designer-backend.digitalboyzone.workers.dev/api/v1/backtest',
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

    const saveStrategy = async (name: string, description: string) => {
        isLoading.value = true
        error.value = null
        const authStore = useAuthStore()

        if (!authStore.token) {
            error.value = 'User must be logged in to save strategy'
            isLoading.value = false
            throw new Error('User must be logged in to save strategy')
        }

        try {
            const headers = {
                'Authorization': `Bearer ${authStore.token}`
            }

            await axios.post(
                'https://investment-strategy-designer-backend.digitalboyzone.workers.dev/api/v1/strategies',
                {
                    name,
                    description,
                    config: config.value
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
        setConfig,
        addTrigger,
        removeTrigger,
        runBacktest,
        saveStrategy,
        reset
    }
})
