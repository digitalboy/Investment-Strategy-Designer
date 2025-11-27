<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
    Stepper,
    StepperDescription,
    StepperItem,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/stepper'

import TriggerConditionForm from './builder/TriggerConditionForm.vue'
import TriggerActionForm from './builder/TriggerActionForm.vue'
import TriggerPreviewPanel from './builder/TriggerPreviewPanel.vue'
import {
    getConditionConfig,
    getConditionKeyFromTrigger,
    type TriggerOptionKey
} from './builder/constants'

const { t } = useI18n()

const props = defineProps<{
    open: boolean
    editingIndex?: number | null
}>()

const emit = defineEmits(['update:open'])

const store = useStrategyStore()

const selectedConditionKey = ref<TriggerOptionKey>('drawdownFromPeak')
const conditionType = ref<TriggerCondition['type']>(getConditionConfig(selectedConditionKey.value).type)
const conditionParams = ref<any>({ ...getConditionConfig(selectedConditionKey.value).defaults })

const isEditing = computed(() => typeof props.editingIndex === 'number' && props.editingIndex >= 0)
const editingTrigger = computed(() => {
    if (!isEditing.value) return null
    const index = props.editingIndex as number
    return store.config.triggers[index] ?? null
})

const stepItems = computed(() => [
    { step: 1, title: t('triggerBuilderDialog.steps.condition.title'), description: t('triggerBuilderDialog.steps.condition.description') },
    { step: 2, title: t('triggerBuilderDialog.steps.action.title'), description: t('triggerBuilderDialog.steps.action.description') },
    { step: 3, title: t('triggerBuilderDialog.steps.cooldown.title'), description: t('triggerBuilderDialog.steps.cooldown.description') },
] as const)

type StepKey = typeof stepItems.value[number]['step']

const activeStep = ref<StepKey>(1)

type ActionValueType = TriggerAction['value']['type']

const FIXED_AMOUNT_DEFAULT = 1000

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

const conditionSummary = computed(() => {
    const params = conditionParams.value
    switch (conditionType.value) {
        case 'drawdownFromPeak':
            return t('triggerBuilderDialog.summaries.conditions.drawdownFromPeak', { days: params.days, percentage: params.percentage })
        case 'newLow':
            return t('triggerBuilderDialog.summaries.conditions.newLow', { days: params.days })
        case 'newHigh':
            return t('triggerBuilderDialog.summaries.conditions.newHigh', { days: params.days })
        case 'priceStreak':
            return t('triggerBuilderDialog.summaries.conditions.priceStreak', {
                count: params.count,
                unit: params.unit === 'day' ? t('triggerConditionForm.units.day') : t('triggerConditionForm.units.week'),
                direction: params.direction === 'up' ? t('triggerConditionForm.directions.up') : t('triggerConditionForm.directions.down')
            })
        case 'periodReturn':
            return t('triggerBuilderDialog.summaries.conditions.periodReturn', {
                days: params.days,
                direction: params.direction === 'up' ? t('triggerConditionForm.directions.up') : t('triggerConditionForm.directions.down'),
                percentage: params.percentage
            })
        case 'rsi':
            return t('triggerBuilderDialog.summaries.conditions.rsi', {
                period: params.period,
                operator: params.operator === 'above' ? t('triggerConditionForm.operators.above') : t('triggerConditionForm.operators.below'),
                threshold: params.threshold
            })
        case 'maCross':
            return t('triggerBuilderDialog.summaries.conditions.maCross', {
                direction: params.direction === 'above' ? t('triggerConditionForm.directions.above') : t('triggerConditionForm.directions.below'),
                period: params.period
            })
        case 'vix':
            if (selectedConditionKey.value === 'vix_streak') {
                return t('triggerBuilderDialog.summaries.conditions.vix_streak', {
                    count: params.streakCount,
                    direction: params.streakDirection === 'up' ? t('triggerConditionForm.directions.up') : t('triggerConditionForm.directions.down')
                })
            }
            if (selectedConditionKey.value === 'vix_breakout') {
                return t('triggerBuilderDialog.summaries.conditions.vix_breakout', {
                    days: params.breakoutDays,
                    type: params.breakoutType === 'high' ? t('triggerConditionForm.descriptions.vix.breakoutHigh') : t('triggerConditionForm.descriptions.vix.breakoutLow')
                })
            }
            return t('triggerBuilderDialog.summaries.conditions.vix', {
                threshold: params.threshold,
                operator: params.operator === 'above' ? t('triggerConditionForm.operators.above') : t('triggerConditionForm.operators.below')
            })
        default:
            return t('triggerBuilderDialog.summaries.conditions.default')
    }
})

const actionSummary = computed(() => {
    const verb = actionType.value === 'buy' ? t('triggerBuilderDialog.summaries.actions.buy') : t('triggerBuilderDialog.summaries.actions.sell')
    const amount = Number(actionAmount.value || 0)

    switch (actionValueType.value) {
        case 'fixedAmount':
            return t('triggerBuilderDialog.summaries.actions.fixedAmount', { amount })
        case 'cashPercent':
            return `${verb} ${t('triggerBuilderDialog.summaries.actions.cashPercent', { amount })}`
        case 'positionPercent':
            return `${verb} ${t('triggerBuilderDialog.summaries.actions.positionPercent', { amount })}`
        case 'totalValuePercent':
            return `${verb} ${t('triggerBuilderDialog.summaries.actions.totalValuePercent', { amount })}`
        default:
            return `${verb} 指定数量`
    }
})

const cooldownSummary = computed(() =>
    enableCooldown.value
        ? t('triggerBuilderDialog.summaries.cooldown.enabled', { days: cooldownDays.value })
        : t('triggerBuilderDialog.summaries.cooldown.disabled')
)

const resetConditionState = (key: TriggerOptionKey) => {
    const config = getConditionConfig(key)
    conditionType.value = config.type
    conditionParams.value = { ...config.defaults }
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
        case 'vix':
            const isStreak = selectedConditionKey.value === 'vix_streak';
            const isBreakout = selectedConditionKey.value === 'vix_breakout';
            
            condition = {
                type: 'vix',
                params: {
                    // Common or mode-specific params
                    mode: isStreak ? 'streak' : (isBreakout ? 'breakout' : 'threshold'),
                    
                    // Threshold params
                    threshold: !isStreak && !isBreakout ? Number(conditionParams.value.threshold) : undefined,
                    operator: !isStreak && !isBreakout ? conditionParams.value.operator : undefined,
                    
                    // Streak params
                    streakDirection: isStreak ? conditionParams.value.streakDirection : undefined,
                    streakCount: isStreak ? Number(conditionParams.value.streakCount) : undefined,
                    
                    // Breakout params
                    breakoutType: isBreakout ? conditionParams.value.breakoutType : undefined,
                    breakoutDays: isBreakout ? Number(conditionParams.value.breakoutDays) : undefined,
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

const dialogTitle = computed(() => (isEditing.value ? t('triggerBuilderDialog.editTitle') : t('triggerBuilderDialog.createTitle')))
const primaryButtonLabel = computed(() => (isEditing.value ? t('triggerBuilderDialog.buttons.save') : t('triggerBuilderDialog.buttons.add')))
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="w-full max-w-6xl xl:max-w-7xl">
            <DialogHeader>
                <DialogTitle>{{ dialogTitle }}</DialogTitle>
                <DialogDescription>{{ t('triggerBuilderDialog.description') }}</DialogDescription>
            </DialogHeader>

            <Stepper v-slot="stepper" v-model="activeStep" orientation="vertical" class="block w-full">
                <div class="flex flex-col gap-5 py-2">
                    <div class="flex flex-col gap-5 lg:flex-row lg:items-start">
                        <div class="w-full shrink-0 space-y-4 lg:w-64">
                            <StepperItem v-for="(step, index) in stepItems" :key="step.step" :step="step.step"
                                v-slot="{ state }" class="block">
                                <StepperTrigger as-child class="p-0 text-left">
                                    <button type="button" :data-state="state"
                                        class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-4 text-left transition hover:border-emerald-300 focus:outline-none data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-50">
                                        <div class="flex items-center gap-3">
                                            <span :data-state="state"
                                                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-600 transition data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 data-[state=completed]:border-emerald-500 data-[state=completed]:bg-emerald-500 data-[state=completed]:text-white">
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

                            <TriggerPreviewPanel :conditionSummary="conditionSummary" :actionSummary="actionSummary"
                                :cooldownSummary="cooldownSummary" class="hidden lg:block" />
                        </div>

                        <div class="flex-1 min-w-0 space-y-5">
                            <!-- Step 1: Condition -->
                            <div ref="stepOneRef" v-show="activeStep === 1">
                                <TriggerConditionForm v-model:selectedKey="selectedConditionKey"
                                    :conditionType="conditionType" :params="conditionParams" class="w-full" />
                            </div>

                            <!-- Step 2: Action -->
                            <div ref="stepTwoRef" v-show="activeStep === 2" :style="stepPanelMinStyle">
                                <TriggerActionForm v-model:actionType="actionType" v-model:valueType="actionValueType"
                                    v-model:amount="actionAmount" class="w-full" />
                            </div>

                            <!-- Step 3: Cooldown -->
                            <section ref="stepThreeRef" v-show="activeStep === 3"
                                class="w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4"
                                :style="stepPanelMinStyle">
                                <header class="flex flex-wrap items-center justify-between gap-3">
                                    <h3 class="text-lg font-semibold text-slate-900">{{
                                        t('triggerBuilderDialog.cooldown.title') }}</h3>
                                    <label class="flex items-center gap-2 text-sm text-slate-600">
                                        <input type="checkbox" v-model="enableCooldown" class="accent-emerald-600" />
                                        {{ t('triggerBuilderDialog.cooldown.enable') }}
                                    </label>
                                </header>

                                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                                    :class="{ 'opacity-50 pointer-events-none': !enableCooldown }">
                                    <div class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                        <Label class="text-xs text-slate-500">{{ t('triggerBuilderDialog.cooldown.days')
                                        }}</Label>
                                        <div class="relative">
                                            <Input type="number" v-model="cooldownDays" class="h-10 pr-10" />
                                            <span class="absolute right-3 top-2.5 text-xs text-slate-500">{{
                                                t('triggerBuilderDialog.cooldown.unit') }}</span>
                                        </div>
                                    </div>
                                    <div
                                        class="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-500 shadow-sm sm:col-span-1 lg:col-span-2">
                                        {{ t('triggerBuilderDialog.cooldown.description') }}
                                    </div>
                                </div>
                            </section>

                            <div
                                class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                                <Button variant="outline" size="sm" :disabled="stepper.isPrevDisabled"
                                    @click="stepper.prevStep()">
                                    {{ t('triggerBuilderDialog.buttons.previous') }}
                                </Button>
                                <Button v-if="!stepper.isLastStep" size="sm" :disabled="stepper.isNextDisabled"
                                    @click="stepper.nextStep()">
                                    {{ t('triggerBuilderDialog.buttons.next') }}
                                </Button>
                                <span v-else class="text-xs text-slate-500">{{
                                    t('triggerBuilderDialog.buttons.complete', {
                                        button: primaryButtonLabel
                                    }) }}</span>
                            </div>
                        </div>
                    </div>

                    <TriggerPreviewPanel :conditionSummary="conditionSummary" :actionSummary="actionSummary"
                        :cooldownSummary="cooldownSummary" class="lg:hidden" />
                </div>
            </Stepper>

            <DialogFooter>
                <Button variant="outline" @click="emit('update:open', false)">{{
                    t('triggerBuilderDialog.buttons.cancel') }}</Button>
                <Button :disabled="activeStep !== stepItems.length" @click="handleSave">{{ primaryButtonLabel
                    }}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
