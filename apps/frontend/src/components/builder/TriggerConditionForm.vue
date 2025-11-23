<script setup lang="ts">
import { computed } from 'vue'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { triggerGroups, type TriggerOptionKey } from './constants'

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

// We can mutate props.params properties directly if it is a reactive object passed from parent,
// but for cleaner data flow with v-model on components, we usually rely on the parent state.
// Since 'params' is an object, v-model="params.days" works if params is reactive.
// However, type safety is loose here with 'any'.
</script>

<template>
    <section class="rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4 space-y-4">
        <header class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-slate-900">如果 (IF)...</h3>
            <span class="text-xs text-slate-500">选择你想捕捉的行情</span>
        </header>

        <div class="space-y-3">
            <RadioGroup v-model="localSelectedKey" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div v-for="group in triggerGroups" :key="group.label"
                    class="space-y-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <p class="text-xs uppercase tracking-wide text-slate-500">
                        {{ group.label }}
                    </p>
                    <div class="space-y-2">
                        <label v-for="item in group.items" :key="item.value"
                            class="flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition hover:border-indigo-300"
                            :class="selectedKey === item.value
                                ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                                : 'border-slate-200 bg-white'">
                            <RadioGroupItem :value="item.value" class="mt-1 text-indigo-600" />
                            <div class="flex flex-col">
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
                    当价格从过去
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    天的最高点，下跌超过
                    <Input type="number" v-model="params.percentage"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    % 时。
                </p>
            </template>

            <template v-else-if="conditionType === 'newHigh'">
                <p class="leading-7">
                    当价格突破过去
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 mx-2 text-center bg-white border border-slate-200" />
                    天的最高价时。
                </p>
            </template>

            <template v-else-if="conditionType === 'newLow'">
                <p class="leading-7">
                    当价格跌破过去
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 mx-2 text-center bg-white border border-slate-200" />
                    天的最低价时。
                </p>
            </template>

            <template v-else-if="conditionType === 'priceStreak'">
                <div class="space-y-2">
                    <p class="flex flex-wrap items-center gap-2">
                        当价格连续
                        <Input type="number" v-model="params.count"
                            class="w-16 h-8 text-center bg-white border border-slate-200" />
                        个
                        <Select v-model="params.unit" class="w-24">
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
                        <Select v-model="params.direction" class="w-28">
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
                    <Input type="number" v-model="params.days"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    天内累计
                    <Select v-model="params.direction" class="w-28">
                        <SelectTrigger class="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="up">上涨</SelectItem>
                            <SelectItem value="down">下跌</SelectItem>
                        </SelectContent>
                    </Select>
                    超过
                    <Input type="number" v-model="params.percentage"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    % 时。
                </p>
            </template>

            <template v-else-if="conditionType === 'rsi'">
                <p class="leading-7 flex flex-wrap items-center gap-2">
                    当 RSI(
                    <Input type="number" v-model="params.period"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    )
                    <Select v-model="params.operator" class="w-28">
                        <SelectTrigger class="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="above">高于</SelectItem>
                            <SelectItem value="below">低于</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input type="number" v-model="params.threshold"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    时。
                </p>
            </template>

            <template v-else-if="conditionType === 'maCross'">
                <p class="leading-7 flex flex-wrap items-center gap-2">
                    当价格
                    <Select v-model="params.direction" class="w-32">
                        <SelectTrigger class="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="above">向上穿越</SelectItem>
                            <SelectItem value="below">向下穿越</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input type="number" v-model="params.period"
                        class="w-16 h-8 text-center bg-white border border-slate-200" />
                    日均线时。
                </p>
            </template>
        </div>
    </section>
</template>
