<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { type TriggerOptionKey } from './constants'

const { t } = useI18n()

const props = defineProps<{
    selectedKey: TriggerOptionKey
    conditionType: string
    params: any
}>()

const emit = defineEmits<{
    'update:selectedKey': [key: TriggerOptionKey]
    'update:params': [params: any]
}>()

const localSelectedKey = computed({
    get: () => props.selectedKey,
    set: (val) => emit('update:selectedKey', val)
})

// Generate trigger groups with translations
const translatedTriggerGroups = computed(() => [
    {
        label: t('triggerConditionForm.groups.buyLow'),
        items: [
            {
                value: 'drawdownFromPeak' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.drawdownFromPeak.label'),
                description: t('triggerConditionForm.conditions.drawdownFromPeak.description')
            },
            {
                value: 'newLow' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.newLow.label'),
                description: t('triggerConditionForm.conditions.newLow.description')
            },
            {
                value: 'priceStreak_down' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.priceStreak_down.label'),
                description: t('triggerConditionForm.conditions.priceStreak_down.description')
            },
        ],
    },
    {
        label: t('triggerConditionForm.groups.trendFollowing'),
        items: [
            {
                value: 'newHigh' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.newHigh.label'),
                description: t('triggerConditionForm.conditions.newHigh.description')
            },
            {
                value: 'priceStreak_up' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.priceStreak_up.label'),
                description: t('triggerConditionForm.conditions.priceStreak_up.description')
            },
            {
                value: 'periodReturn_up' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.periodReturn_up.label'),
                description: t('triggerConditionForm.conditions.periodReturn_up.description')
            },
        ],
    },
    {
        label: t('triggerConditionForm.groups.technicalIndicators'),
        items: [
            {
                value: 'periodReturn_down' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.periodReturn_down.label'),
                description: t('triggerConditionForm.conditions.periodReturn_down.description')
            },
            {
                value: 'rsi' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.rsi.label'),
                description: t('triggerConditionForm.conditions.rsi.description')
            },
            {
                value: 'maCross' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.maCross.label'),
                description: t('triggerConditionForm.conditions.maCross.description')
            },
        ],
    },
    {
        label: t('triggerConditionForm.groups.marketSentiment'),
        items: [
            {
                value: 'vix' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.vix.label'),
                description: t('triggerConditionForm.conditions.vix.description')
            },
            {
                value: 'vix_streak' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.vix_streak.label'),
                description: t('triggerConditionForm.conditions.vix_streak.description')
            },
            {
                value: 'vix_breakout' as TriggerOptionKey,
                label: t('triggerConditionForm.conditions.vix_breakout.label'),
                description: t('triggerConditionForm.conditions.vix_breakout.description')
            },
        ],
    },
])

// We can mutate props.params properties directly if it is a reactive object passed from parent,
// but for cleaner data flow with v-model on components, we usually rely on the parent state.
// Since 'params' is an object, v-model="params.days" works if params is reactive.
// However, type safety is loose here with 'any'.
</script>

<template>
    <section class="w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4">
        <header class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-slate-900">{{ t('triggerConditionForm.if') }}</h3>
            <span class="text-xs text-slate-500">{{ t('triggerConditionForm.description') }}</span>
        </header>

        <div class="space-y-3">
            <RadioGroup v-model="localSelectedKey" class="space-y-3">
                <div v-for="group in translatedTriggerGroups" :key="group.label"
                    class="space-y-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <p class="text-xs uppercase tracking-wide text-slate-500">
                        {{ group.label }}
                    </p>
                    <div class="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        <label v-for="item in group.items" :key="item.value"
                            class="flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 transition hover:border-emerald-300"
                            :class="selectedKey === item.value
                                ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                                : 'border-slate-200 bg-white'">
                            <RadioGroupItem :value="item.value" class="mt-0.5 text-emerald-600 shrink-0" />
                            <div class="flex flex-col min-w-0">
                                <span class="text-sm font-medium text-slate-900">{{ item.label }}</span>
                                <span class="text-xs text-slate-500">{{ item.description }}</span>
                            </div>
                        </label>
                    </div>
                </div>
            </RadioGroup>
        </div>

        <div class="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700 space-y-2">
            <template v-if="conditionType === 'drawdownFromPeak'">
                <p class="flex flex-wrap items-center gap-2 leading-7">
                    {{ t('triggerConditionForm.descriptions.drawdownFromPeak.prefix') }}
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.drawdownFromPeak.middle') }}
                    <Input type="number" v-model="params.percentage"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.drawdownFromPeak.suffix') }}
                </p>
            </template>

            <template v-else-if="conditionType === 'newHigh'">
                <p class="leading-7">
                    {{ t('triggerConditionForm.descriptions.newHigh.prefix') }}
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 mx-2 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.newHigh.middle') }}
                </p>
            </template>

            <template v-else-if="conditionType === 'newLow'">
                <p class="leading-7">
                    {{ t('triggerConditionForm.descriptions.newLow.prefix') }}
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 mx-2 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.newLow.middle') }}
                </p>
            </template>

            <template v-else-if="conditionType === 'priceStreak'">
                <p class="leading-7 flex flex-wrap items-center gap-2">
                    {{ t('triggerConditionForm.descriptions.priceStreak.prefix') }}
                    <Input type="number" v-model="params.count"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.priceStreak.middle') }}
                    <Select v-model="params.unit" class="w-24">
                        <SelectTrigger class="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">{{ t('triggerConditionForm.units.day') }}</SelectItem>
                            <SelectItem value="week">{{ t('triggerConditionForm.units.week') }}</SelectItem>
                        </SelectContent>
                    </Select>
                    {{ t('triggerConditionForm.descriptions.priceStreak.direction.' + params.direction) }}
                    {{ t('triggerConditionForm.descriptions.priceStreak.suffix') }}
                </p>
            </template>

            <template v-else-if="conditionType === 'periodReturn'">
                <p class="leading-7 flex flex-wrap items-center gap-2">
                    {{ t('triggerConditionForm.descriptions.periodReturn.prefix') }}
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.periodReturn.middle') }}
                    <Select v-model="params.direction" class="w-28">
                        <SelectTrigger class="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="up">{{ t('triggerConditionForm.directions.up') }}</SelectItem>
                            <SelectItem value="down">{{ t('triggerConditionForm.directions.down') }}</SelectItem>
                        </SelectContent>
                    </Select>
                    {{ t('triggerConditionForm.descriptions.periodReturn.moreThan') }}
                    <Input type="number" v-model="params.percentage"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.periodReturn.suffix') }}
                </p>
            </template>

            <template v-else-if="conditionType === 'rsi'">
                <p class="leading-7 flex flex-wrap items-center gap-2">
                    {{ t('triggerConditionForm.descriptions.rsi.prefix') }}
                    <Input type="number" v-model="params.period"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.rsi.middle') }}
                    <Select v-model="params.operator" class="w-28">
                        <SelectTrigger class="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="above">{{ t('triggerConditionForm.operators.above') }}</SelectItem>
                            <SelectItem value="below">{{ t('triggerConditionForm.operators.below') }}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input type="number" v-model="params.threshold"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.rsi.suffix') }}
                </p>
            </template>

            <template v-else-if="conditionType === 'maCross'">
                <p class="leading-7 flex flex-wrap items-center gap-2">
                    {{ t('triggerConditionForm.descriptions.maCross.prefix') }}
                    <Select v-model="params.direction" class="w-32">
                        <SelectTrigger class="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="above">{{ t('triggerConditionForm.directions.above') }}</SelectItem>
                            <SelectItem value="below">{{ t('triggerConditionForm.directions.below') }}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input type="number" v-model="params.period"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    {{ t('triggerConditionForm.descriptions.maCross.middle') }}
                </p>
            </template>

            <template v-else-if="conditionType === 'vix'">
                <template v-if="localSelectedKey === 'vix'">
                    <p class="leading-7 flex flex-wrap items-center gap-2">
                        {{ t('triggerConditionForm.descriptions.vix.prefix') }}
                        <Select v-model="params.operator" class="w-32">
                            <SelectTrigger class="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="above">{{ t('triggerConditionForm.operators.above') }}</SelectItem>
                                <SelectItem value="below">{{ t('triggerConditionForm.operators.below') }}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input type="number" v-model="params.threshold"
                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                        {{ t('triggerConditionForm.descriptions.vix.suffix') }}
                    </p>
                </template>
                <template v-else-if="localSelectedKey === 'vix_streak'">
                    <p class="leading-7 flex flex-wrap items-center gap-2">
                        {{ t('triggerConditionForm.descriptions.vix.streakPrefix') }}
                        <Input type="number" v-model="params.streakCount"
                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                        {{ t('triggerConditionForm.descriptions.vix.streakSuffix') }}
                        <Select v-model="params.streakDirection" class="w-28">
                            <SelectTrigger class="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="up">{{ t('triggerConditionForm.directions.up') }}</SelectItem>
                                <SelectItem value="down">{{ t('triggerConditionForm.directions.down') }}</SelectItem>
                            </SelectContent>
                        </Select>
                    </p>
                </template>
                <template v-else-if="localSelectedKey === 'vix_breakout'">
                    <p class="leading-7 flex flex-wrap items-center gap-2">
                        {{ t('triggerConditionForm.descriptions.vix.breakoutPrefix') }}
                        <Input type="number" v-model="params.breakoutDays"
                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                        {{ t('triggerConditionForm.descriptions.vix.breakoutSuffix') }}
                        <Select v-model="params.breakoutType" class="w-28">
                            <SelectTrigger class="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="high">{{ t('triggerConditionForm.descriptions.vix.breakoutHigh') }}
                                </SelectItem>
                                <SelectItem value="low">{{ t('triggerConditionForm.descriptions.vix.breakoutLow') }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </p>
                </template>
            </template>
        </div>
    </section>
</template>
