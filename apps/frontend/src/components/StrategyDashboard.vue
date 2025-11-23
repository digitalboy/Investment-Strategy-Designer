<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useStrategyStore } from '@/stores/strategy'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { Badge } from '@/components/ui/badge'
import type { Trigger } from '@/types'
import { ArrowLeft, Trash2, Calendar, Wallet, Layers, Settings, Activity, Pencil } from 'lucide-vue-next'

const emit = defineEmits(['edit-setup', 'back'])

const store = useStrategyStore()
const authStore = useAuthStore()
const { config, currentStrategyMetadata, currentStrategyName, backtestResult, error, isLoading } = storeToRefs(store)
const triggers = computed(() => config.value.triggers)

const editableName = ref('')
const editableVisibility = ref<'public' | 'private'>('private')
const isEditingName = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

watch(
    [currentStrategyMetadata, currentStrategyName],
    ([metadata, name]) => {
        if (metadata) {
            editableName.value = name || metadata.name || ''
            editableVisibility.value = metadata.isPublic ? 'public' : 'private'
        } else {
            editableName.value = name || ''
            editableVisibility.value = 'private'
        }
    },
    { immediate: true }
)

const trimmedEditableName = computed(() => editableName.value.trim())
const isPublicSelected = computed(() => editableVisibility.value === 'public')

const isPublicChecked = computed({
    get: () => isPublicSelected.value,
    set: (checked: boolean) => {
        toggleVisibility(checked)
    }
})

const startEditingName = () => {
    isEditingName.value = true
    setTimeout(() => nameInputRef.value?.focus(), 0)
}

const finishEditingName = async () => {
    if (!trimmedEditableName.value) {
        // 如果名称为空，恢复原始值
        if (currentStrategyMetadata.value) {
            editableName.value = currentStrategyMetadata.value.name || currentStrategyName.value || ''
        }
        isEditingName.value = false
        return
    }

    // 检查名称是否有变化
    const originalName = currentStrategyMetadata.value?.name || currentStrategyName.value || ''
    if (trimmedEditableName.value === originalName) {
        isEditingName.value = false
        return
    }

    // 自动保存名称
    if (currentStrategyMetadata.value) {
        try {
            await store.updateStrategy({
                id: currentStrategyMetadata.value.id,
                name: trimmedEditableName.value,
                isPublic: isPublicSelected.value,
                skipBacktest: true
            })
        } catch (e) {
            console.error('Failed to update name:', e)
            // 恢复原始值
            editableName.value = originalName
        }
    }

    isEditingName.value = false
}

const toggleVisibility = async (checked: boolean) => {
    console.log('toggleVisibility called with:', checked)
    const newVisibility = checked ? 'public' : 'private'
    const oldVisibility = editableVisibility.value

    // 立即更新UI
    editableVisibility.value = newVisibility

    // 自动保存可见性
    if (currentStrategyMetadata.value) {
        console.log('Updating visibility to backend:', {
            id: currentStrategyMetadata.value.id,
            isPublic: checked,
            name: trimmedEditableName.value
        })
        try {
            await store.updateStrategy({
                id: currentStrategyMetadata.value.id,
                name: trimmedEditableName.value,
                isPublic: checked,
                skipBacktest: true
            })
            console.log('Visibility updated successfully')
        } catch (e) {
            console.error('Failed to update visibility:', e)
            // 恢复原始值
            editableVisibility.value = oldVisibility
        }
    } else {
        console.warn('No currentStrategyMetadata, skipping backend update')
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

watch(showTriggerBuilder, isOpen => {
    if (!isOpen) {
        editingTriggerIndex.value = null
    }
})

const canAdjustSetup = computed(() => !currentStrategyMetadata.value)
const canDelete = computed(() => !!currentStrategyMetadata.value?.isOwner)

const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return '--'
    const amount = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(amount)) return '--'
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const investingHorizon = computed(() => {
    if (!config.value.startDate || !config.value.endDate) return '时间范围未设定'
    return `${config.value.startDate} → ${config.value.endDate}`
})

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
const updateDisabled = computed(() => !hasTriggers.value || isLoading.value || !trimmedEditableName.value.length)
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

const removeTrigger = (index: number) => {
    store.removeTrigger(index)
}

const onStrategySaved = () => {
    console.log('Strategy saved successfully')
}

const handleUpdate = async () => {
    if (!currentStrategyMetadata.value) return
    const safeName = trimmedEditableName.value

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
            isPublic: isPublicSelected.value
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
        <section
            class="rounded-3xl border border-indigo-300/40 bg-linear-to-r from-indigo-600 via-blue-600 to-violet-600 px-6 py-5 shadow-2xl shadow-indigo-500/20 sticky top-4 z-20">
            <div class="max-w-7xl mx-auto">
                <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <!-- Left: Title & Meta -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2 text-indigo-100">
                            <Button variant="ghost" size="icon"
                                class="h-8 w-8 -ml-2 text-indigo-100 hover:text-white hover:bg-white/20 rounded-full transition-all"
                                @click="$emit('back')">
                                <ArrowLeft class="h-4 w-4" />
                            </Button>
                            <span class="text-xs font-medium uppercase tracking-wider text-indigo-100">策略回测工作台</span>
                        </div>

                        <div class="flex items-center gap-3 flex-wrap">
                            <div class="flex items-center gap-2">
                                <div v-if="!isEditingName" class="flex items-center gap-2">
                                    <h1 class="text-2xl font-bold text-white tracking-tight">{{ strategyTitle }}</h1>
                                    <Button v-if="currentStrategyMetadata?.isOwner" variant="ghost" size="icon"
                                        class="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                        :disabled="isLoading" @click="startEditingName">
                                        <Pencil class="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <Input v-else ref="nameInputRef" v-model="editableName" :disabled="isLoading"
                                    placeholder="输入策略名称"
                                    class="text-2xl font-bold h-10 bg-white/20 border-white/30 text-white placeholder:text-white/50"
                                    @blur="finishEditingName" @keydown.enter="finishEditingName"
                                    @keydown.esc="finishEditingName" />
                            </div>
                            <Badge variant="outline"
                                class="font-mono text-white bg-white/20 border-white/30 px-3 py-0.5 rounded-lg shadow-sm backdrop-blur-sm">
                                {{ config.etfSymbol || '未选标的' }}
                            </Badge>
                        </div>

                        <div class="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                            <div class="flex items-center gap-2 group cursor-help" title="回测时间范围">
                                <Calendar class="h-4 w-4 text-indigo-100 group-hover:text-white transition-colors" />
                                <span class="font-medium text-white/90 group-hover:text-white transition-colors">{{
                                    investingHorizon }}</span>
                            </div>
                            <div class="flex items-center gap-2 group cursor-help" title="初始本金">
                                <Wallet class="h-4 w-4 text-indigo-100 group-hover:text-white transition-colors" />
                                <span class="font-medium text-white/90 group-hover:text-white transition-colors">{{
                                    formatCurrency(config.initialCapital) }}</span>
                            </div>
                            <div class="flex items-center gap-2 group cursor-help" title="触发器数量">
                                <Layers class="h-4 w-4 text-indigo-100 group-hover:text-white transition-colors" />
                                <span class="font-medium text-white/90 group-hover:text-white transition-colors">{{
                                    triggers.length }} 个触发器</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Status & Actions -->
                    <div class="flex items-center gap-4 pt-2">
                        <!-- Visibility Toggle -->
                        <div v-if="currentStrategyMetadata?.isOwner"
                            class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                            <div class="flex items-center gap-2">
                                <svg v-if="isPublicSelected" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <svg v-else class="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span class="text-xs font-medium text-white/90">{{ isPublicSelected ? '公开' : '私有'
                                }}</span>
                            </div>
                            <Switch v-model="isPublicChecked" :disabled="isLoading"
                                class="data-[state=checked]:bg-white/60 data-[state=unchecked]:bg-white/20 border-0" />
                        </div>

                        <div class="h-8 w-px bg-white/20 mx-2 hidden md:block" v-if="canAdjustSetup"></div>

                        <Button v-if="canAdjustSetup" variant="outline"
                            class="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition-all backdrop-blur-sm"
                            @click="$emit('edit-setup')">
                            <Settings class="h-4 w-4 mr-2" />
                            设置
                        </Button>
                    </div>
                </div>
            </div>
        </section>

        <div class="flex flex-col gap-6 xl:flex-row">
            <Card
                class="border-slate-200/50 shadow-xl shadow-slate-200/50 flex-1 bg-linear-to-br from-white via-blue-50/60 to-indigo-100/50 backdrop-blur-sm">
                <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>触发器面板</CardTitle>
                        <CardDescription>查看触发顺序并快速调整条件、动作与冷却。</CardDescription>
                    </div>
                    <Button v-if="canEdit" size="sm" class="w-full sm:w-auto" @click="openTriggerBuilder">
                        添加触发器
                    </Button>
                </CardHeader>
                <CardContent>
                    <div v-if="triggerSummaries.length === 0"
                        class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                        <p class="text-slate-500">{{ emptyStateMessage }}</p>
                        <Button v-if="canEdit" class="mt-4" @click="openTriggerBuilder">立即创建</Button>
                    </div>
                    <ol v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                        <li v-for="summary in triggerSummaries" :key="summary.id"
                            class="rounded-2xl border border-indigo-200/40 bg-linear-to-br from-white via-indigo-50/50 to-blue-100/40 p-4 shadow-lg shadow-indigo-200/30 hover:shadow-xl hover:shadow-indigo-300/40 hover:-translate-y-1 transition-all duration-300 h-full">
                            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between h-full">
                                <div class="flex items-start gap-3">
                                    <span
                                        class="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-600 to-blue-600 text-white font-semibold shadow-lg shadow-indigo-500/30">
                                        {{ summary.order }}
                                    </span>
                                    <div class="space-y-3">
                                        <div>
                                            <p class="text-xs uppercase tracking-wide text-slate-400">条件</p>
                                            <p class="text-sm font-semibold text-slate-900 mt-1">{{ summary.condition }}
                                            </p>
                                        </div>
                                        <div class="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <p class="text-xs uppercase tracking-wide text-slate-400">动作</p>
                                                <p class="text-sm text-slate-800 mt-1">{{ summary.action }}</p>
                                            </div>
                                            <div>
                                                <p class="text-xs uppercase tracking-wide text-slate-400">冷却</p>
                                                <p class="text-sm text-slate-800 mt-1">{{ summary.cooldown || '无冷却' }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="canEdit" class="flex gap-2 self-start">
                                    <Button variant="ghost" size="icon"
                                        class="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                        @click="editTrigger(summary.order - 1)">
                                        <Pencil class="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon"
                                        class="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                        @click="removeTrigger(summary.order - 1)">
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </li>
                    </ol>
                </CardContent>
            </Card>

            <div class="flex flex-col gap-6 xl:w-96 self-start">
                <Card
                    class="border-slate-200/50 shadow-xl shadow-slate-200/50 bg-linear-to-br from-white via-violet-50/55 to-purple-100/45 backdrop-blur-sm">
                    <CardHeader class="pb-4">
                        <CardTitle class="text-base">执行指南</CardTitle>
                    </CardHeader>
                    <CardContent class="flex flex-col gap-4 text-sm text-slate-600">
                        <div
                            class="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/50 to-blue-50/30 p-4">
                            <div class="flex items-center gap-2 mb-2">
                                <Activity class="h-4 w-4 text-indigo-600" />
                                <span class="font-semibold text-slate-900">当前状态</span>
                            </div>
                            <p class="text-xs text-slate-600 leading-relaxed">{{ statusBadge?.description || '暂无异常' }}
                            </p>
                        </div>

                        <div class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 space-y-2">
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">提示</p>
                            <ul class="space-y-2">
                                <li class="flex gap-2 text-xs text-slate-600">
                                    <span class="text-indigo-500">•</span>
                                    交易将在信号触发后的次日开盘时执行。
                                </li>
                                <li class="flex gap-2 text-xs text-slate-600">
                                    <span class="text-indigo-500">•</span>
                                    保证至少一个条件与动作配对。
                                </li>
                                <li class="flex gap-2 text-xs text-slate-600">
                                    <span class="text-indigo-500">•</span>
                                    确认时间范围、本金与标的是否准确。
                                </li>
                                <li v-if="canEdit" class="flex gap-2 text-xs text-slate-600">
                                    <span class="text-indigo-500">•</span>
                                    保存后可在社区或个人空间复用策略。
                                </li>
                            </ul>
                        </div>

                        <div v-if="backtestResult"
                            class="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-green-50/50 p-4">
                            <p class="text-xs font-bold text-emerald-700 mb-1">✓ 回测完成</p>
                            <p class="text-xs text-emerald-600">已有回测结果，可重新运行以刷新表现。</p>
                        </div>
                    </CardContent>
                </Card>
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
