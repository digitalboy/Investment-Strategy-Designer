<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Check, Circle, Dot } from 'lucide-vue-next'
import { useStrategyStore } from '@/stores/strategy'
import type { Trigger, TriggerCondition, TriggerAction } from '@/types'
import { useResizeObserver } from '@vueuse/core'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Stepper,
    StepperDescription,
    StepperItem,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/stepper'

const props = defineProps<{
    open: boolean
    editingIndex?: number | null
}>()

const emit = defineEmits(['update:open'])

const store = useStrategyStore()

const triggerGroups = [
    {
        label: '📉 逢低买入（抄底）',
        items: [
            { value: 'drawdownFromPeak', label: '高点回撤', description: '价格自历史高点明显回撤' },
            { value: 'newLow', label: '创新低（破底）', description: '跌破过去 N 日最低点' },
            { value: 'priceStreak_down', label: '连续下跌（连阴）', description: '连续多天收盘走低' },
        ],
    },
    {
        label: '🚀 趋势跟随（追涨）',
        items: [
            { value: 'newHigh', label: '创新高（突破）', description: '突破过去 N 日最高价' },
            { value: 'priceStreak_up', label: '连续上涨（连阳）', description: '连续多天收盘走高' },
            { value: 'periodReturn_up', label: '近期强势（急涨）', description: '短期涨幅过大' },
        ],
    },
    {
        label: '📊 技术指标',
        items: [
            { value: 'periodReturn_down', label: '近期大跌幅', description: '短期跌幅过大' },
            { value: 'rsi', label: 'RSI 超买/超卖', description: '经典动量指标' },
            { value: 'maCross', label: '均线交叉', description: '短期均线与长期均线交叉' },
        ],
    },
]

const baseConditionDefaults = {
    drawdownFromPeak: { days: 60, percentage: 15 },
    priceStreak: { direction: 'down', count: 3, unit: 'day' },
    rsi: { period: 14, threshold: 30, operator: 'below' },
    newHigh: { days: 60 },
    newLow: { days: 60 },
    periodReturn: { days: 30, percentage: 10, direction: 'up' },
    maCross: { period: 20, direction: 'above' },
}

const conditionMap = {
    drawdownFromPeak: { type: 'drawdownFromPeak', defaults: baseConditionDefaults.drawdownFromPeak },
    newLow: { type: 'newLow', defaults: baseConditionDefaults.newLow },
    newHigh: { type: 'newHigh', defaults: baseConditionDefaults.newHigh },
    priceStreak_down: { type: 'priceStreak', defaults: { ...baseConditionDefaults.priceStreak, direction: 'down' } },
    priceStreak_up: { type: 'priceStreak', defaults: { ...baseConditionDefaults.priceStreak, direction: 'up' } },
    periodReturn_up: { type: 'periodReturn', defaults: { ...baseConditionDefaults.periodReturn, direction: 'up' } },
    periodReturn_down: { type: 'periodReturn', defaults: { ...baseConditionDefaults.periodReturn, direction: 'down' } },
    rsi: { type: 'rsi', defaults: baseConditionDefaults.rsi },
    maCross: { type: 'maCross', defaults: baseConditionDefaults.maCross },
} as const

type TriggerOptionKey = keyof typeof conditionMap

const getConditionConfig = (key: TriggerOptionKey) => conditionMap[key]

const selectedConditionKey = ref<TriggerOptionKey>('drawdownFromPeak')
const conditionType = ref<TriggerCondition['type']>(getConditionConfig(selectedConditionKey.value).type)
const conditionParams = ref<any>({ ...getConditionConfig(selectedConditionKey.value).defaults })

const isEditing = computed(() => typeof props.editingIndex === 'number' && props.editingIndex >= 0)
const editingTrigger = computed(() => {
    if (!isEditing.value) return null
    const index = props.editingIndex as number
    return store.config.triggers[index] ?? null
})

const stepItems = [
    { step: 1, title: '如果 (IF)...', description: '选择你想捕捉的行情' },
    { step: 2, title: '那么 (THEN)...', description: '确定系统如何下单' },
    { step: 3, title: '并且 (AND)...冷却期', description: '设置冷静期避免重复触发' },
] as const

type StepKey = typeof stepItems[number]['step']

const activeStep = ref<StepKey>(1)

type ActionValueType = TriggerAction['value']['type']

const FIXED_AMOUNT_DEFAULT = 1000
const PERCENT_AMOUNT_DEFAULT = 10
const PERCENT_VALUE_TYPES: ActionValueType[] = ['cashPercent', 'positionPercent', 'totalValuePercent']

const actionType = ref<'buy' | 'sell'>('buy')
const actionValueType = ref<ActionValueType>('fixedAmount')
const actionAmount = ref(FIXED_AMOUNT_DEFAULT)

const enableCooldown = ref(true)
const cooldownDays = ref(5)

const stepOneRef = ref<HTMLElement | null>(null)
const stepTwoRef = ref<HTMLElement | null>(null)
const stepThreeRef = ref<HTMLElement | null>(null)
const firstStepHeight = ref(0)

useResizeObserver(stepOneRef, entries => {
    const entry = entries[0]
    if (!entry) return
    firstStepHeight.value = entry.contentRect.height
})

const stepPanelMinStyle = computed(() =>
    firstStepHeight.value ? { minHeight: `${Math.round(firstStepHeight.value)}px` } : undefined
)

const actionValueOptions = computed<{ value: ActionValueType; label: string }[]>(() => {
    if (actionType.value === 'buy') {
        return [
            { value: 'fixedAmount', label: '固定金额 ($)' },
            { value: 'cashPercent', label: '可用现金百分比 (%)' },
            { value: 'totalValuePercent', label: '总资产目标仓位 (%)' },
        ]
    }

    return [
        { value: 'fixedAmount', label: '固定金额 ($)' },
        { value: 'positionPercent', label: '持仓百分比 (%)' },
        { value: 'totalValuePercent', label: '总资产目标仓位 (%)' },
    ]
})

const isPercentValueType = computed(() => PERCENT_VALUE_TYPES.includes(actionValueType.value))

const actionValueSuffix = computed(() => (isPercentValueType.value ? '%' : '$'))

const actionAmountLimits = computed(() => {
    if (isPercentValueType.value) {
        return { min: 1, max: 100, step: 1 }
    }
    return { min: 1, max: undefined, step: 100 }
})

const actionValueHint = computed(() => {
    switch (actionValueType.value) {
        case 'cashPercent':
            return '使用账户当前可用现金的百分比进行下单'
        case 'positionPercent':
            return '卖出当前持仓的一定百分比'
        case 'totalValuePercent':
            return '调整仓位，使其占账户总资产的指定百分比'
        default:
            return '输入本次交易的金额或百分比'
    }
})

const flatTriggerOptions = triggerGroups.flatMap(group => group.items)
const selectedTriggerOption = computed(() => flatTriggerOptions.find(item => item.value === selectedConditionKey.value))

const conditionSummary = computed(() => {
    const params = conditionParams.value
    switch (conditionType.value) {
        case 'drawdownFromPeak':
            return `当价格从过去 ${params.days} 天高点下跌超过 ${params.percentage}% 时`
        case 'newLow':
            return `当价格跌破过去 ${params.days} 天最低点`
        case 'newHigh':
            return `当价格突破过去 ${params.days} 天最高点`
        case 'priceStreak':
            return `当价格连续 ${params.count} 个${params.unit === 'day' ? '交易日' : '周'}收盘${params.direction === 'up' ? '上涨' : '下跌'}`
        case 'periodReturn':
            return `当价格在过去 ${params.days} 天累计${params.direction === 'up' ? '上涨' : '下跌'}超过 ${params.percentage}%`
        case 'rsi':
            return `当 RSI(${params.period}) ${params.operator === 'above' ? '高于' : '低于'} ${params.threshold}`
        case 'maCross':
            return `当价格 ${params.direction === 'above' ? '向上' : '向下'} 穿越 ${params.period} 日均线`
        default:
            return '配置触发条件'
    }
})

const actionSummary = computed(() => {
    const verb = actionType.value === 'buy' ? '买入' : '卖出'
    const amount = Number(actionAmount.value || 0)

    switch (actionValueType.value) {
        case 'fixedAmount':
            return `${verb} ${amount} 美元`
        case 'cashPercent':
            return `${verb} 可用现金的 ${amount}%`
        case 'positionPercent':
            return `${verb} 当前持仓的 ${amount}%`
        case 'totalValuePercent':
            return `${verb} 仓位至总资产的 ${amount}%`
        default:
            return `${verb} 指定数量`
    }
})

const cooldownSummary = computed(() =>
    enableCooldown.value ? `随后 ${cooldownDays.value} 天内不再重复执行` : '不设置冷却期'
)

const resetConditionState = (key: TriggerOptionKey) => {
    const config = getConditionConfig(key)
    conditionType.value = config.type
    conditionParams.value = { ...config.defaults }
}

const getConditionKeyFromTrigger = (condition: TriggerCondition): TriggerOptionKey => {
    switch (condition.type) {
        case 'drawdownFromPeak':
            return 'drawdownFromPeak'
        case 'newLow':
            return 'newLow'
        case 'newHigh':
            return 'newHigh'
        case 'priceStreak':
            return condition.params?.direction === 'up' ? 'priceStreak_up' : 'priceStreak_down'
        case 'periodReturn':
            return condition.params?.direction === 'down' ? 'periodReturn_down' : 'periodReturn_up'
        case 'rsi':
            return 'rsi'
        case 'maCross':
            return 'maCross'
        default:
            return 'drawdownFromPeak'
    }
}

const applyTriggerToForm = (trigger: Trigger) => {
    if (!trigger) return
    const key = getConditionKeyFromTrigger(trigger.condition)
    selectedConditionKey.value = key
    conditionType.value = trigger.condition.type
    conditionParams.value = { ...trigger.condition.params }
    actionType.value = trigger.action.type
    actionValueType.value = trigger.action.value.type
    actionAmount.value = Number(trigger.action.value.amount)
    enableCooldown.value = !!trigger.cooldown
    cooldownDays.value = trigger.cooldown?.days ?? 5
    activeStep.value = 1
}

const resetForm = () => {
    selectedConditionKey.value = 'drawdownFromPeak'
    resetConditionState('drawdownFromPeak')
    actionType.value = 'buy'
    actionValueType.value = 'fixedAmount'
    actionAmount.value = FIXED_AMOUNT_DEFAULT
    enableCooldown.value = true
    cooldownDays.value = 5
    activeStep.value = 1
}

watch(() => props.open, isOpen => {
    if (isOpen) {
        if (isEditing.value && editingTrigger.value) {
            applyTriggerToForm(editingTrigger.value)
        } else {
            resetForm()
        }
    }
})

watch(editingTrigger, trigger => {
    if (props.open && trigger) {
        applyTriggerToForm(trigger)
    }
})

watch(selectedConditionKey, key => {
    resetConditionState(key)
})

watch(actionValueOptions, options => {
    if (!options.find(option => option.value === actionValueType.value)) {
        actionValueType.value = options[0]?.value ?? ('fixedAmount' as ActionValueType)
    }
}, { immediate: true })

const clampActionAmount = (value: number) => {
    if (isPercentValueType.value) {
        return Math.min(Math.max(value || PERCENT_AMOUNT_DEFAULT, 1), 100)
    }
    return Math.max(value || FIXED_AMOUNT_DEFAULT, 1)
}

watch(actionValueType, (next: ActionValueType, previous: ActionValueType | undefined) => {
    const wasPercent = previous ? PERCENT_VALUE_TYPES.includes(previous) : false
    const isPercent = PERCENT_VALUE_TYPES.includes(next)
    if (isPercent && !wasPercent) {
        actionAmount.value = PERCENT_AMOUNT_DEFAULT
    } else if (!isPercent && wasPercent) {
        actionAmount.value = FIXED_AMOUNT_DEFAULT
    } else {
        actionAmount.value = clampActionAmount(Number(actionAmount.value))
    }
})

watch(actionAmount, value => {
    const numeric = Number(value)
    const clamped = clampActionAmount(numeric)
    if (clamped !== numeric) {
        actionAmount.value = clamped
    }
})

const handleSave = () => {
    let condition: TriggerCondition

    switch (conditionType.value) {
        case 'drawdownFromPeak':
            condition = {
                type: 'drawdownFromPeak',
                params: {
                    days: Number(conditionParams.value.days),
                    percentage: Number(conditionParams.value.percentage),
                },
            }
            break
        case 'priceStreak':
            condition = {
                type: 'priceStreak',
                params: {
                    direction: conditionParams.value.direction,
                    count: Number(conditionParams.value.count),
                    unit: conditionParams.value.unit,
                },
            }
            break
        case 'rsi':
            condition = {
                type: 'rsi',
                params: {
                    period: Number(conditionParams.value.period),
                    threshold: Number(conditionParams.value.threshold),
                    operator: conditionParams.value.operator,
                },
            }
            break
        case 'newHigh':
        case 'newLow':
            condition = {
                type: conditionType.value,
                params: { days: Number(conditionParams.value.days) },
            }
            break
        case 'periodReturn':
            condition = {
                type: 'periodReturn',
                params: {
                    days: Number(conditionParams.value.days),
                    percentage: Number(conditionParams.value.percentage),
                    direction: conditionParams.value.direction,
                },
            }
            break
        case 'maCross':
            condition = {
                type: 'maCross',
                params: {
                    period: Number(conditionParams.value.period),
                    direction: conditionParams.value.direction,
                },
            }
            break
        default:
            condition = {
                type: 'drawdownFromPeak',
                params: { days: 60, percentage: 15 },
            }
    }

    const action: TriggerAction = {
        type: actionType.value,
        value: {
            type: actionValueType.value as TriggerAction['value']['type'],
            amount: Number(actionAmount.value),
        },
    }

    const trigger: Trigger = {
        condition,
        action,
        cooldown: enableCooldown.value ? { days: Number(cooldownDays.value) } : undefined,
    }

    if (isEditing.value && typeof props.editingIndex === 'number') {
        store.updateTrigger(props.editingIndex, trigger)
    } else {
        store.addTrigger(trigger)
    }
    emit('update:open', false)
}

const dialogTitle = computed(() => (isEditing.value ? '编辑交易触发器' : '创建交易触发器'))
const primaryButtonLabel = computed(() => (isEditing.value ? '保存修改' : '添加此规则'))
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="w-full max-w-6xl xl:max-w-7xl">
            <DialogHeader>
                <DialogTitle>{{ dialogTitle }}</DialogTitle>
                <DialogDescription>定义“如果...那么...”规则来执行交易。</DialogDescription>
            </DialogHeader>

            <Stepper v-slot="stepper" v-model="activeStep" orientation="vertical" class="w-full">
                <div class="flex flex-col gap-5 py-2 lg:flex-row">
                    <div class="w-full space-y-4 lg:w-64">
                        <StepperItem v-for="(step, index) in stepItems" :key="step.step" :step="step.step"
                            v-slot="{ state }" class="block">
                            <StepperTrigger as-child class="flex-1 items-stretch p-0 text-left">
                                <button type="button" :data-state="state"
                                    class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-4 text-left transition hover:border-indigo-300 focus:outline-none data-[state=active]:border-indigo-500 data-[state=active]:bg-indigo-50">
                                    <div class="flex items-center gap-3">
                                        <span :data-state="state"
                                            class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-600 transition data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=completed]:border-indigo-500 data-[state=completed]:bg-indigo-500 data-[state=completed]:text-white">
                                            <Check v-if="state === 'completed'" class="h-4 w-4" />
                                            <Circle v-else-if="state === 'active'" class="h-4 w-4" />
                                            <Dot v-else class="h-4 w-4 text-slate-400" />
                                        </span>
                                        <div class="flex flex-col">
                                            <StepperTitle class="text-sm font-medium text-slate-900">
                                                {{ step.title }}
                                            </StepperTitle>
                                            <StepperDescription class="text-xs text-slate-500">
                                                {{ step.description }}
                                            </StepperDescription>
                                        </div>
                                    </div>
                                </button>
                            </StepperTrigger>
                            <StepperSeparator v-if="index < stepItems.length - 1"
                                class="ml-6 h-8 w-px bg-slate-200 lg:ml-8" />
                        </StepperItem>
                    </div>

                    <div class="flex-1 min-w-0 space-y-5">
                        <section ref="stepOneRef" v-show="activeStep === 1"
                            class="rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4">
                            <header class="flex flex-wrap items-center justify-between gap-3">
                                <h3 class="text-lg font-semibold text-slate-900">如果 (IF)...</h3>
                                <span class="text-xs text-slate-500">选择你想捕捉的行情</span>
                            </header>

                            <div class="space-y-3">
                                <RadioGroup v-model="selectedConditionKey"
                                    class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <div v-for="group in triggerGroups" :key="group.label"
                                        class="space-y-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                                        <p class="text-xs uppercase tracking-wide text-slate-500">
                                            {{ group.label }}
                                        </p>
                                        <div class="space-y-2">
                                            <label v-for="item in group.items" :key="item.value"
                                                class="flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition hover:border-indigo-300"
                                                :class="selectedConditionKey === item.value
                                                    ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                                                    : 'border-slate-200 bg-white'">
                                                <RadioGroupItem :value="item.value" class="mt-1 text-indigo-600" />
                                                <div class="flex flex-col">
                                                    <span class="text-sm font-medium text-slate-900">{{ item.label
                                                        }}</span>
                                                    <span class="text-xs text-slate-500">{{ item.description }}</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </RadioGroup>
                                <p class="text-xs text-slate-500" v-if="selectedTriggerOption">
                                    {{ selectedTriggerOption.description }}
                                </p>
                            </div>

                            <div
                                class="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700 space-y-2">
                                <template v-if="conditionType === 'drawdownFromPeak'">
                                    <p class="flex flex-wrap items-center gap-2 leading-7">
                                        当价格从过去
                                        <Input type="number" v-model="conditionParams.days"
                                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                                        天的最高点，下跌超过
                                        <Input type="number" v-model="conditionParams.percentage"
                                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                                        % 时。
                                    </p>
                                </template>

                                <template v-else-if="conditionType === 'newHigh'">
                                    <p class="leading-7">
                                        当价格突破过去
                                        <Input type="number" v-model="conditionParams.days"
                                            class="w-16 h-8 mx-2 text-center bg-white border border-slate-200" />
                                        天的最高价时。
                                    </p>
                                </template>

                                <template v-else-if="conditionType === 'newLow'">
                                    <p class="leading-7">
                                        当价格跌破过去
                                        <Input type="number" v-model="conditionParams.days"
                                            class="w-16 h-8 mx-2 text-center bg-white border border-slate-200" />
                                        天的最低价时。
                                    </p>
                                </template>

                                <template v-else-if="conditionType === 'priceStreak'">
                                    <div class="space-y-2">
                                        <p class="flex flex-wrap items-center gap-2">
                                            当价格连续
                                            <Input type="number" v-model="conditionParams.count"
                                                class="w-16 h-8 text-center bg-white border border-slate-200" />
                                            个
                                            <Select v-model="conditionParams.unit" class="w-24">
                                                <SelectTrigger class="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="day">交易日</SelectItem>
                                                    <SelectItem value="week">周</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </p>
                                        <p class="flex flex-wrap items-center gap-2">
                                            收盘
                                            <Select v-model="conditionParams.direction" class="w-28">
                                                <SelectTrigger class="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="up">📈 上涨</SelectItem>
                                                    <SelectItem value="down">📉 下跌</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            时。
                                        </p>
                                    </div>
                                </template>

                                <template v-else-if="conditionType === 'periodReturn'">
                                    <p class="leading-7 flex flex-wrap items-center gap-2">
                                        当价格在过去
                                        <Input type="number" v-model="conditionParams.days"
                                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                                        天内累计
                                        <Select v-model="conditionParams.direction" class="w-28">
                                            <SelectTrigger class="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="up">上涨</SelectItem>
                                                <SelectItem value="down">下跌</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        超过
                                        <Input type="number" v-model="conditionParams.percentage"
                                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                                        % 时。
                                    </p>
                                </template>

                                <template v-else-if="conditionType === 'rsi'">
                                    <p class="leading-7 flex flex-wrap items-center gap-2">
                                        当 RSI(
                                        <Input type="number" v-model="conditionParams.period"
                                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                                        )
                                        <Select v-model="conditionParams.operator" class="w-28">
                                            <SelectTrigger class="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="above">高于</SelectItem>
                                                <SelectItem value="below">低于</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input type="number" v-model="conditionParams.threshold"
                                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                                        时。
                                    </p>
                                </template>

                                <template v-else-if="conditionType === 'maCross'">
                                    <p class="leading-7 flex flex-wrap items-center gap-2">
                                        当价格
                                        <Select v-model="conditionParams.direction" class="w-32">
                                            <SelectTrigger class="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="above">向上穿越</SelectItem>
                                                <SelectItem value="below">向下穿越</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input type="number" v-model="conditionParams.period"
                                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                                        日均线时。
                                    </p>
                                </template>
                            </div>
                        </section>

                        <section ref="stepTwoRef" v-show="activeStep === 2"
                            class="rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4"
                            :style="stepPanelMinStyle">
                            <header class="flex flex-wrap items-center justify-between gap-3">
                                <h3 class="text-lg font-semibold text-slate-900">那么 (THEN)...</h3>
                                <span class="text-xs text-slate-500">确定系统如何下单</span>
                            </header>

                            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                    <Label class="text-xs text-slate-500">操作</Label>
                                    <Select v-model="actionType">
                                        <SelectTrigger class="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="buy">买入</SelectItem>
                                            <SelectItem value="sell">卖出</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                    <Label class="text-xs text-slate-500">金额类型</Label>
                                    <Select v-model="actionValueType">
                                        <SelectTrigger class="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem v-for="option in actionValueOptions" :key="option.value"
                                                :value="option.value">
                                                {{ option.label }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div
                                    class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm md:col-span-2 xl:col-span-1">
                                    <Label class="text-xs text-slate-500">数值</Label>
                                    <div class="relative">
                                        <Input type="number" v-model="actionAmount" class="h-10 pr-10"
                                            :min="actionAmountLimits.min" :max="actionAmountLimits.max"
                                            :step="actionAmountLimits.step" />
                                        <span class="absolute right-3 top-2.5 text-xs text-slate-500">{{
                                            actionValueSuffix }}</span>
                                    </div>
                                </div>
                                <div
                                    class="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-500 shadow-sm md:col-span-2 xl:col-span-3">
                                    {{ actionValueHint }}
                                </div>
                            </div>
                        </section>

                        <section ref="stepThreeRef" v-show="activeStep === 3"
                            class="rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4"
                            :style="stepPanelMinStyle">
                            <header class="flex flex-wrap items-center justify-between gap-3">
                                <h3 class="text-lg font-semibold text-slate-900">并且 (AND)...冷却期</h3>
                                <label class="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" v-model="enableCooldown" class="accent-indigo-600" />
                                    启用冷静期
                                </label>
                            </header>

                            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                                :class="{ 'opacity-50 pointer-events-none': !enableCooldown }">
                                <div class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                    <Label class="text-xs text-slate-500">冷却天数</Label>
                                    <div class="relative">
                                        <Input type="number" v-model="cooldownDays" class="h-10 pr-10" />
                                        <span class="absolute right-3 top-2.5 text-xs text-slate-500">天</span>
                                    </div>
                                </div>
                                <div
                                    class="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-500 shadow-sm md:col-span-1 xl:col-span-2">
                                    冷却期可避免重复交易。系统将在冷却结束后再次检查触发条件。
                                </div>
                            </div>
                        </section>

                        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                            <Button variant="outline" size="sm" :disabled="stepper.isPrevDisabled"
                                @click="stepper.prevStep()">
                                上一步
                            </Button>
                            <Button v-if="!stepper.isLastStep" size="sm" :disabled="stepper.isNextDisabled"
                                @click="stepper.nextStep()">
                                下一步
                            </Button>
                            <span v-else class="text-xs text-slate-500">完成设置后点击下方“{{ primaryButtonLabel }}”</span>
                        </div>
                    </div>

                    <aside
                        class="h-fit w-full rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-5 lg:sticky lg:top-4 lg:w-72">
                        <p class="text-xs font-semibold tracking-wide text-indigo-600">💡 策略预览</p>
                        <p class="mt-2 text-sm leading-6 text-indigo-900">
                            {{ conditionSummary }}，系统将 {{ actionSummary }}。{{ cooldownSummary }}。
                        </p>
                    </aside>
                </div>
            </Stepper>

            <DialogFooter>
                <Button variant="outline" @click="emit('update:open', false)">取消</Button>
                <Button :disabled="activeStep !== stepItems.length" @click="handleSave">{{ primaryButtonLabel
                    }}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
