<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { TriggerAction } from '@/types'

const { t } = useI18n()

type ActionValueType = TriggerAction['value']['type']

const props = defineProps<{
    actionType: 'buy' | 'sell'
    valueType: ActionValueType
    amount: number
}>()

const emit = defineEmits<{
    'update:actionType': [value: 'buy' | 'sell']
    'update:valueType': [value: ActionValueType]
    'update:amount': [value: number]
}>()

const localActionType = computed({
    get: () => props.actionType,
    set: (val) => emit('update:actionType', val)
})

const localValueType = computed({
    get: () => props.valueType,
    set: (val) => emit('update:valueType', val)
})

const localAmount = computed({
    get: () => props.amount,
    set: (val) => emit('update:amount', val)
})

const PERCENT_VALUE_TYPES: ActionValueType[] = ['cashPercent', 'positionPercent', 'totalValuePercent']
const FIXED_AMOUNT_DEFAULT = 1000
const PERCENT_AMOUNT_DEFAULT = 10
const INITIAL_CAPITAL = 10000 // 初始资金限制

const actionValueOptions = computed<{ value: ActionValueType; label: string }[]>(() => {
    if (localActionType.value === 'buy') {
        return [
            { value: 'fixedAmount', label: t('triggerActionForm.fixedAmount') },
            { value: 'cashPercent', label: t('triggerActionForm.cashPercent') },
            { value: 'totalValuePercent', label: t('triggerActionForm.totalValuePercent') },
        ]
    }

    return [
        { value: 'fixedAmount', label: t('triggerActionForm.fixedAmount') },
        { value: 'positionPercent', label: t('triggerActionForm.positionPercent') },
        { value: 'totalValuePercent', label: t('triggerActionForm.totalValuePercent') },
    ]
})

const isPercentValueType = computed(() => PERCENT_VALUE_TYPES.includes(localValueType.value))
const actionValueSuffix = computed(() => (isPercentValueType.value ? '%' : '$'))

const actionAmountLimits = computed(() => {
    if (isPercentValueType.value) {
        return { min: 1, max: 100, step: 1 }
    }
    // 固定金额：买入时限制最大值为初始资金
    if (localActionType.value === 'buy') {
        return { min: 1, max: INITIAL_CAPITAL, step: 100 }
    }
    return { min: 1, max: undefined, step: 100 }
})

const actionValueHint = computed(() => {
    switch (localValueType.value) {
        case 'cashPercent':
            return t('triggerActionForm.hints.cashPercent')
        case 'positionPercent':
            return t('triggerActionForm.hints.positionPercent')
        case 'totalValuePercent':
            return t('triggerActionForm.hints.totalValuePercent')
        case 'fixedAmount':
            if (localActionType.value === 'buy') {
                return t('triggerActionForm.hints.fixedAmountBuy', { max: INITIAL_CAPITAL.toLocaleString() })
            }
            return t('triggerActionForm.hints.default')
        default:
            return t('triggerActionForm.hints.default')
    }
})

// Watch logic to reset defaults or clamp values when types change
// This logic was in the parent, we should probably keep it here for self-containment
// But updating props directly is not allowed. We must emit updates.

// When actionValueOptions change (due to actionType change), ensure valueType is valid
watch(actionValueOptions, options => {
    if (!options.find(option => option.value === localValueType.value)) {
        localValueType.value = options[0]?.value ?? ('fixedAmount' as ActionValueType)
    }
})

const clampActionAmount = (value: number) => {
    if (isPercentValueType.value) {
        return Math.min(Math.max(value || PERCENT_AMOUNT_DEFAULT, 1), 100)
    }
    // 固定金额：买入时限制最大值为初始资金
    if (localActionType.value === 'buy') {
        return Math.min(Math.max(value || FIXED_AMOUNT_DEFAULT, 1), INITIAL_CAPITAL)
    }
    return Math.max(value || FIXED_AMOUNT_DEFAULT, 1)
}

// When valueType changes, reset amount default
watch(localValueType, (next: ActionValueType, previous: ActionValueType | undefined) => {
    const wasPercent = previous ? PERCENT_VALUE_TYPES.includes(previous) : false
    const isPercent = PERCENT_VALUE_TYPES.includes(next)

    // Only update if changing between percent and fixed/other modes
    if (isPercent && !wasPercent) {
        localAmount.value = PERCENT_AMOUNT_DEFAULT
    } else if (!isPercent && wasPercent) {
        localAmount.value = FIXED_AMOUNT_DEFAULT
    } else {
        // Re-clamp existing value
        localAmount.value = clampActionAmount(Number(localAmount.value))
    }
})

// When amount changes, clamp it
watch(localAmount, value => {
    const numeric = Number(value)
    const clamped = clampActionAmount(numeric)
    if (clamped !== numeric) {
        localAmount.value = clamped
    }
})

</script>

<template>
    <section class="w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4">
        <header class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-slate-900">{{ t('triggerActionForm.then') }}</h3>
            <span class="text-xs text-slate-500">{{ t('triggerActionForm.description') }}</span>
        </header>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <Label class="text-xs text-slate-500">{{ t('triggerActionForm.action') }}</Label>
                <Select v-model="localActionType">
                    <SelectTrigger class="h-10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="buy">{{ t('triggerActionForm.buy') }}</SelectItem>
                        <SelectItem value="sell">{{ t('triggerActionForm.sell') }}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <Label class="text-xs text-slate-500">{{ t('triggerActionForm.amountType') }}</Label>
                <Select v-model="localValueType">
                    <SelectTrigger class="h-10">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="option in actionValueOptions" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div
                class="space-y-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
                <Label class="text-xs text-slate-500">{{ t('triggerActionForm.value') }}</Label>
                <div class="relative">
                    <Input type="number" v-model="localAmount" class="h-10 pr-10" :min="actionAmountLimits.min"
                        :max="actionAmountLimits.max" :step="actionAmountLimits.step" />
                    <span class="absolute right-3 top-2.5 text-xs text-slate-500">{{
                        actionValueSuffix }}</span>
                </div>
            </div>
            <div
                class="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-500 shadow-sm sm:col-span-2 lg:col-span-3">
                {{ actionValueHint }}
            </div>
        </div>
    </section>
</template>
