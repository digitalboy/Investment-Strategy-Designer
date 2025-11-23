<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useStrategyStore } from '@/stores/strategy'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction
} from '@/components/ui/alert-dialog'
import TriggerBuilderDialog from './TriggerBuilderDialog.vue'
import ResultsReportDialog from './ResultsReportDialog.vue'
import SaveStrategyDialog from './SaveStrategyDialog.vue'
import StockLoading from './StockLoading.vue'
import type { Trigger } from '@/types'

// New components
import StrategyHeader from './dashboard/StrategyHeader.vue'
import TriggerListPanel from './dashboard/TriggerListPanel.vue'
import ExecutionGuidePanel from './dashboard/ExecutionGuidePanel.vue'

const emit = defineEmits(['edit-setup', 'back'])

const { t } = useI18n()

const store = useStrategyStore()
const authStore = useAuthStore()
const { config, currentStrategyMetadata, currentStrategyName, backtestResult, error, isLoading } = storeToRefs(store)
const triggers = computed(() => config.value.triggers)

// StrategyHeader related actions
const handleNameUpdate = async (newName: string) => {
    if (!currentStrategyMetadata.value) {
        // If it's a new strategy (not saved yet), just update the local store name
        store.currentStrategyName = newName
        return
    }

    try {
        await store.updateStrategy({
            id: currentStrategyMetadata.value.id,
            name: newName,
            isPublic: currentStrategyMetadata.value.isPublic,
            skipBacktest: true
        })
    } catch (e) {
        console.error('Failed to update name:', e)
        // Revert handled by component via props update
    }
}

const handleVisibilityUpdate = async (isPublic: boolean) => {
    if (!currentStrategyMetadata.value) return

    console.log('Updating visibility to backend:', {
        id: currentStrategyMetadata.value.id,
        isPublic: isPublic
    })
    try {
        await store.updateStrategy({
            id: currentStrategyMetadata.value.id,
            isPublic: isPublic,
            skipBacktest: true
        })
        console.log('Visibility updated successfully')
    } catch (e) {
        console.error('Failed to update visibility:', e)
    }
}

const canEdit = computed(() => {
    if (!authStore.isAuthenticated) return false
    if (!currentStrategyMetadata.value) return true
    return !!currentStrategyMetadata.value.isOwner
})

const showTriggerBuilder = ref(false)
const showResults = ref(false)
const showSaveDialog = ref(false)
const showDeleteDialog = ref(false)
const editingTriggerIndex = ref<number | null>(null)

const openTriggerBuilder = () => {
    editingTriggerIndex.value = null
    showTriggerBuilder.value = true
}

const editTrigger = (index: number) => {
    editingTriggerIndex.value = index
    showTriggerBuilder.value = true
}

const removeTrigger = (index: number) => {
    store.removeTrigger(index)
}

const canAdjustSetup = computed(() => !currentStrategyMetadata.value)
const canDelete = computed(() => !!currentStrategyMetadata.value?.isOwner)

const strategyTitle = computed(() => currentStrategyName.value || currentStrategyMetadata.value?.name || t('strategy.unnamedStrategy'))

const statusBadge = computed(() => {
    if (error.value) {
        return {
            label: t('strategy.status.needsAttention'),
            description: error.value,
            classes: 'border-red-200 bg-red-50 text-red-700'
        }
    }
    if (isLoading.value) {
        return {
            label: t('strategy.status.backtesting'),
            description: t('strategy.status.backtestingDescription'),
            classes: 'border-indigo-200 bg-indigo-50 text-indigo-700'
        }
    }
    if (!triggers.value.length) {
        return {
            label: t('strategy.status.waitingForConfig'),
            description: t('strategy.status.waitingForConfigDescription'),
            classes: 'border-amber-200 bg-amber-50 text-amber-700'
        }
    }
    return {
        label: t('strategy.status.ready'),
        description: t('strategy.status.readyDescription'),
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }
})

const describeTrigger = (trigger: Trigger) => {
    try {
        if (!trigger || !trigger.condition) {
            return {
                condition: t('strategy.triggers.invalidTriggerConfig'),
                action: t('strategy.triggers.actionMissing'),
                cooldown: ''
            }
        }

        const c = trigger.condition
        if (!c.params) {
            return {
                condition: t('strategy.triggers.triggerParamsMissing'),
                action: t('strategy.triggers.actionMissing'),
                cooldown: trigger.cooldown ? `${trigger.cooldown.days} 天` : ''
            }
        }

        let conditionText = ''
        switch (c.type) {
            case 'drawdownFromPeak':
                conditionText = t('strategy.triggers.conditions.drawdownFromPeak', {
                    days: c.params.days,
                    percentage: c.params.percentage
                })
                break
            case 'priceStreak': {
                const dir = c.params.direction === 'up' ? t('common.up') : t('common.down')
                const unit = c.params.unit === 'day' ? t('common.day') : t('common.week')
                conditionText = t('strategy.triggers.conditions.priceStreak', {
                    direction: dir,
                    count: c.params.count,
                    unit: unit
                })
                break
            }
            case 'rsi': {
                const op = c.params.operator === 'above' ? t('common.above') : t('common.below')
                conditionText = t('strategy.triggers.conditions.rsi', {
                    period: c.params.period,
                    operator: op,
                    threshold: c.params.threshold
                })
                break
            }
            case 'newHigh':
                conditionText = t('strategy.triggers.conditions.newHigh', { days: c.params.days })
                break
            case 'newLow':
                conditionText = t('strategy.triggers.conditions.newLow', { days: c.params.days })
                break
            case 'periodReturn': {
                const dir = c.params.direction === 'up' ? t('common.up') : t('common.down')
                conditionText = t('strategy.triggers.conditions.periodReturn', {
                    days: c.params.days,
                    direction: dir,
                    percentage: c.params.percentage
                })
                break
            }
            case 'maCross': {
                const dir = c.params.direction === 'above' ? t('common.above') : t('common.below')
                conditionText = t('strategy.triggers.conditions.maCross', {
                    direction: dir,
                    period: c.params.period
                })
                break
            }
            default:
                conditionText = t('strategy.triggers.unknownCondition')
        }

        let actionText = t('strategy.triggers.actionMissing')
        const a = trigger.action
        if (a) {
            const actionType = a.type === 'buy' ? t('strategy.triggers.actions.buy') : t('strategy.triggers.actions.sell')
            switch (a.value.type) {
                case 'fixedAmount':
                    actionText = `${actionType} ${t('strategy.triggers.actions.fixedAmount', { amount: a.value.amount })}`
                    break
                case 'cashPercent':
                    actionText = `${actionType} ${t('strategy.triggers.actions.cashPercent', { amount: a.value.amount })}`
                    break
                case 'positionPercent':
                    actionText = `${actionType} ${t('strategy.triggers.actions.positionPercent', { amount: a.value.amount })}`
                    break
                case 'totalValuePercent':
                    actionText = `${actionType} ${t('strategy.triggers.actions.totalValuePercent', { amount: a.value.amount })}`
                    break
                default:
                    actionText = `${actionType} $${a.value.amount}`
            }
        }

        const cooldownText = trigger.cooldown ? `${trigger.cooldown.days} 天` : ''

        return {
            condition: conditionText,
            action: actionText,
            cooldown: cooldownText
        }
    } catch (e) {
        console.error('Error formatting trigger:', e, trigger)
        return {
            condition: t('strategy.triggers.triggerDisplayError'),
            action: t('strategy.triggers.actionDisplayError'),
            cooldown: ''
        }
    }
}

const triggerSummaries = computed(() => triggers.value.map((trigger: Trigger, index: number) => {
    const details = describeTrigger(trigger)
    return {
        id: `${index}-${trigger.condition?.type ?? 'unknown'}`,
        order: index + 1,
        ...details
    }
}))

const emptyStateMessage = computed(() => {
    if (canEdit.value) return t('strategy.messages.noTriggersYet')
    return t('strategy.messages.noPublicTriggers')
})

const hasTriggers = computed(() => triggers.value.length > 0)

const runDisabled = computed(() => !hasTriggers.value || isLoading.value)
const saveDisabled = computed(() => !hasTriggers.value)
const updateDisabled = computed(() => !hasTriggers.value || isLoading.value || !strategyTitle.value.trim().length)
const runDisabledReason = computed(() => {
    if (!hasTriggers.value) return t('strategy.messages.pleaseAddTriggers')
    if (isLoading.value) return t('strategy.messages.backtestRunning')
    return ''
})

const handleRunBacktest = async () => {
    await store.runBacktest()
    if (!error.value) {
        showResults.value = true
    }
}

const onStrategySaved = () => {
    console.log('Strategy saved successfully')
}

const handleUpdate = async () => {
    if (!currentStrategyMetadata.value) return
    const safeName = strategyTitle.value.trim()

    if (!safeName) {
        alert(t('strategy.messages.pleaseFillStrategyName'))
        return
    }

    const strategyId = currentStrategyMetadata.value.id
    console.log('Updating strategy with ID:', strategyId, typeof strategyId)

    try {
        await store.updateStrategy({
            id: strategyId,
            name: safeName,
            isPublic: currentStrategyMetadata.value.isPublic
        })
        alert(t('strategy.messages.strategyUpdateSuccess'))
    } catch (e) {
        console.error('Failed to update strategy:', e)
        alert(t('strategy.messages.updateFailed'))
    }
}

const handleDelete = async () => {
    if (!currentStrategyMetadata.value) return

    try {
        await store.deleteStrategy(currentStrategyMetadata.value.id)
        alert(t('strategy.messages.strategyDeleted'))
        emit('back')
    } catch (e) {
        console.error('Failed to delete strategy:', e)
        alert(t('strategy.messages.deleteFailed'))
    } finally {
        showDeleteDialog.value = false
    }
}
</script>

<template>
    <div class="space-y-6 pb-36 animate-fade-in">
        <!-- Header Section -->
        <StrategyHeader :title="strategyTitle" :metadata="currentStrategyMetadata" :config="config"
            :trigger-count="triggers.length" :is-loading="isLoading" :can-adjust-setup="canAdjustSetup"
            @back="$emit('back')" @edit-setup="$emit('edit-setup')" @update-name="handleNameUpdate"
            @update-visibility="handleVisibilityUpdate" />

        <div class="flex flex-col gap-6 xl:flex-row">
            <!-- Trigger List Panel -->
            <TriggerListPanel :trigger-summaries="triggerSummaries" :can-edit="canEdit"
                :empty-state-message="emptyStateMessage" @open-builder="openTriggerBuilder" @edit-trigger="editTrigger"
                @remove-trigger="removeTrigger" />

            <div class="flex flex-col gap-6 xl:w-96 self-start">
                <!-- Execution Guide Panel -->
                <ExecutionGuidePanel :status-badge="statusBadge" :has-result="!!backtestResult" :can-edit="canEdit" />
            </div>
        </div>

        <div
            class="sticky bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 p-4 backdrop-blur-md shadow-lg shadow-slate-900/5">
            <div class="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-center">
                <AlertDialog v-if="canDelete" v-model:open="showDeleteDialog">
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="lg"
                            class="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50" :disabled="isLoading">
                            {{ t('common.delete') }}{{ t('strategy.title') }}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{{ t('strategy.messages.confirmDeleteStrategy') }}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {{ t('strategy.messages.deleteStrategyDescription') }}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                            <AlertDialogAction class="bg-red-600 text-white hover:bg-red-700" :disabled="isLoading"
                                @click="handleDelete">
                                {{ t('strategy.messages.confirmDelete') }}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button v-if="canEdit && currentStrategyMetadata?.isOwner" variant="outline" size="lg"
                    class="w-full sm:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    :disabled="updateDisabled" @click="handleUpdate">
                    {{ t('strategy.messages.updateStrategy') }}
                </Button>
                <Button v-if="canEdit" variant="outline" size="lg" class="w-full sm:w-auto" :disabled="saveDisabled"
                    @click="showSaveDialog = true">
                    {{ currentStrategyMetadata?.isOwner ? t('strategy.messages.saveAsNewStrategy') :
                        t('strategy.messages.saveStrategy') }}
                </Button>
                <Button size="lg"
                    class="w-full sm:w-auto bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/30 transition-all"
                    :disabled="runDisabled" :title="runDisabledReason" @click="handleRunBacktest">
                    <span v-if="isLoading">{{ t('strategy.messages.running') }}</span>
                    <span v-else>{{ t('strategy.messages.runBacktest') }}</span>
                </Button>
            </div>
        </div>

        <TriggerBuilderDialog v-model:open="showTriggerBuilder" :editing-index="editingTriggerIndex" />
        <ResultsReportDialog v-model:open="showResults" />
        <SaveStrategyDialog v-model:open="showSaveDialog" @saved="onStrategySaved" />

        <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <StockLoading v-if="isLoading" fullscreen :text="t('strategy.messages.backtestingStrategyPerformance')" />
        </Transition>
    </div>
</template>
