<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
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

const strategyTitle = computed(() => currentStrategyName.value || currentStrategyMetadata.value?.name || '未命名策略')

const statusBadge = computed(() => {
    if (error.value) {
        return {
            label: '需要关注',
            description: error.value,
            classes: 'border-red-200 bg-red-50 text-red-700'
        }
    }
    if (isLoading.value) {
        return {
            label: '回测中',
            description: '策略回测正在运行，稍后可查看最新结果。',
            classes: 'border-indigo-200 bg-indigo-50 text-indigo-700'
        }
    }
    if (!triggers.value.length) {
        return {
            label: '等待配置',
            description: '添加至少一个触发器后即可保存并运行回测。',
            classes: 'border-amber-200 bg-amber-50 text-amber-700'
        }
    }
    return {
        label: '准备就绪',
        description: '配置完整，当前策略可以直接运行回测。',
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }
})

const describeTrigger = (trigger: Trigger) => {
    try {
        if (!trigger || !trigger.condition) {
            return {
                condition: '无效的触发器配置',
                action: '动作缺失',
                cooldown: ''
            }
        }

        const c = trigger.condition
        if (!c.params) {
            return {
                condition: '触发器参数缺失',
                action: '动作缺失',
                cooldown: trigger.cooldown ? `${trigger.cooldown.days} 天` : ''
            }
        }

        let conditionText = ''
        switch (c.type) {
            case 'drawdownFromPeak':
                conditionText = `价格从 ${c.params.days} 日高点下跌超过 ${c.params.percentage}%`
                break
            case 'priceStreak': {
                const dir = c.params.direction === 'up' ? '上涨' : '下跌'
                const unit = c.params.unit === 'day' ? '天' : '周'
                conditionText = `价格连续 ${dir} ${c.params.count} ${unit}`
                break
            }
            case 'rsi': {
                const op = c.params.operator === 'above' ? '高于' : '低于'
                conditionText = `RSI(${c.params.period}) ${op} ${c.params.threshold}`
                break
            }
            case 'newHigh':
                conditionText = `价格创 ${c.params.days} 日新高`
                break
            case 'newLow':
                conditionText = `价格创 ${c.params.days} 日新低`
                break
            case 'periodReturn': {
                const dir = c.params.direction === 'up' ? '上涨' : '下跌'
                conditionText = `${c.params.days} 日内${dir}超过 ${c.params.percentage}%`
                break
            }
            case 'maCross': {
                const dir = c.params.direction === 'above' ? '上穿' : '下穿'
                conditionText = `价格${dir} MA${c.params.period}`
                break
            }
            default:
                conditionText = '未知条件'
        }

        let actionText = '动作缺失'
        const a = trigger.action
        if (a) {
            const actionType = a.type === 'buy' ? '买入' : '卖出'
            switch (a.value.type) {
                case 'fixedAmount':
                    actionText = `${actionType} $${a.value.amount}`
                    break
                case 'cashPercent':
                    actionText = `${actionType} ${a.value.amount}% 现金`
                    break
                case 'positionPercent':
                    actionText = `${actionType} ${a.value.amount}% 持仓`
                    break
                case 'totalValuePercent':
                    actionText = `${actionType} ${a.value.amount}% 总资产`
                    break
                default:
                    actionText = `${actionType} ${a.value.amount}`
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
            condition: '触发器显示错误',
            action: '动作显示错误',
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
    if (canEdit.value) return '尚未创建触发器，点击下方按钮立即开始。'
    return '该策略还没有公开触发器配置。'
})

const hasTriggers = computed(() => triggers.value.length > 0)

const runDisabled = computed(() => !hasTriggers.value || isLoading.value)
const saveDisabled = computed(() => !hasTriggers.value)
const updateDisabled = computed(() => !hasTriggers.value || isLoading.value || !strategyTitle.value.trim().length)
const runDisabledReason = computed(() => {
    if (!hasTriggers.value) return '请先添加触发器'
    if (isLoading.value) return '策略回测正在运行'
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
        alert('请填写策略名称')
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
        alert('策略更新成功！')
    } catch (e) {
        console.error('Failed to update strategy:', e)
        alert('更新失败，请重试')
    }
}

const handleDelete = async () => {
    if (!currentStrategyMetadata.value) return

    try {
        await store.deleteStrategy(currentStrategyMetadata.value.id)
        alert('策略已删除')
        emit('back')
    } catch (e) {
        console.error('Failed to delete strategy:', e)
        alert('删除失败，请稍后重试')
    } finally {
        showDeleteDialog.value = false
    }
}
</script>

<template>
    <div class="space-y-6 pb-36 animate-fade-in">
        <!-- Header Section -->
        <StrategyHeader 
            :title="strategyTitle"
            :metadata="currentStrategyMetadata"
            :config="config"
            :trigger-count="triggers.length"
            :is-loading="isLoading"
            :can-adjust-setup="canAdjustSetup"
            @back="$emit('back')"
            @edit-setup="$emit('edit-setup')"
            @update-name="handleNameUpdate"
            @update-visibility="handleVisibilityUpdate"
        />

        <div class="flex flex-col gap-6 xl:flex-row">
            <!-- Trigger List Panel -->
            <TriggerListPanel 
                :trigger-summaries="triggerSummaries"
                :can-edit="canEdit"
                :empty-state-message="emptyStateMessage"
                @open-builder="openTriggerBuilder"
                @edit-trigger="editTrigger"
                @remove-trigger="removeTrigger"
            />

            <div class="flex flex-col gap-6 xl:w-96 self-start">
                <!-- Execution Guide Panel -->
                <ExecutionGuidePanel 
                    :status-badge="statusBadge"
                    :has-result="!!backtestResult"
                    :can-edit="canEdit"
                />
            </div>
        </div>

        <div
            class="sticky bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 p-4 backdrop-blur-md shadow-lg shadow-slate-900/5">
            <div class="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-center">
                <AlertDialog v-if="canDelete" v-model:open="showDeleteDialog">
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="lg"
                            class="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50" :disabled="isLoading">
                            删除策略
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>确认删除该策略？</AlertDialogTitle>
                            <AlertDialogDescription>
                                删除操作不可撤销，只能删除自己创建的策略。确认后该策略及其回测记录将被清除。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction class="bg-red-600 text-white hover:bg-red-700" :disabled="isLoading"
                                @click="handleDelete">
                                确认删除
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button v-if="canEdit && currentStrategyMetadata?.isOwner" variant="outline" size="lg"
                    class="w-full sm:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    :disabled="updateDisabled" @click="handleUpdate">
                    更新策略
                </Button>
                <Button v-if="canEdit" variant="outline" size="lg" class="w-full sm:w-auto" :disabled="saveDisabled"
                    @click="showSaveDialog = true">
                    {{ currentStrategyMetadata?.isOwner ? '另存为新策略' : '保存策略' }}
                </Button>
                <Button size="lg"
                    class="w-full sm:w-auto bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/30 transition-all"
                    :disabled="runDisabled" :title="runDisabledReason" @click="handleRunBacktest">
                    <span v-if="isLoading">运行中...</span>
                    <span v-else>运行回测</span>
                </Button>
            </div>
        </div>

        <TriggerBuilderDialog v-model:open="showTriggerBuilder" :editing-index="editingTriggerIndex" />
        <ResultsReportDialog v-model:open="showResults" />
        <SaveStrategyDialog v-model:open="showSaveDialog" @saved="onStrategySaved" />

        <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <StockLoading v-if="isLoading" fullscreen text="正在回测策略表现..." />
        </Transition>
    </div>
</template>
