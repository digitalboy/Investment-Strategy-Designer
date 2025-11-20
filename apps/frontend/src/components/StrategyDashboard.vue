<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useStrategyStore } from '@/stores/strategy'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import TriggerBuilderDialog from './TriggerBuilderDialog.vue'
import ResultsReportDialog from './ResultsReportDialog.vue'
import SaveStrategyDialog from './SaveStrategyDialog.vue'
import type { Trigger } from '@/types'

const store = useStrategyStore()
const { config } = storeToRefs(store)
const triggers = computed(() => config.value.triggers)

const showTriggerBuilder = ref(false)
const showResults = ref(false)
const showSaveDialog = ref(false)

const formatTrigger = (trigger: Trigger) => {
    let conditionText = ''
    const c = trigger.condition
    if (c.type === 'drawdownFromPeak') {
        conditionText = `价格从 ${c.params.days} 日高点下跌超过 ${c.params.percentage}%`
    } else if (c.type === 'priceStreak') {
        const dir = c.params.direction === 'up' ? '上涨' : '下跌'
        const unit = c.params.unit === 'day' ? '天' : '周'
        conditionText = `价格连续 ${dir} ${c.params.count} ${unit}`
    } else if (c.type === 'rsi') {
        const op = c.params.operator === 'above' ? '高于' : '低于'
        conditionText = `RSI(${c.params.period}) ${op} ${c.params.threshold}`
    } else {
        conditionText = `未知条件`
    }

    let actionText = ''
    const a = trigger.action
    const actionType = a.type === 'buy' ? '买入' : '卖出'
    if (a.value.type === 'fixedAmount') {
        actionText = `${actionType} $${a.value.amount}`
    } else if (a.value.type === 'cashPercent') {
        actionText = `${actionType} ${a.value.amount}% 现金`
    } else {
        actionText = `${actionType} ${a.value.amount}`
    }

    let cooldownText = ''
    if (trigger.cooldown) {
        cooldownText = `(冷却期: ${trigger.cooldown.days} 天)`
    }

    return `如果 ${conditionText}，那么 ${actionText} ${cooldownText}`
}

const handleRunBacktest = async () => {
    await store.runBacktest()
    if (!store.error) {
        showResults.value = true
    }
}

const removeTrigger = (index: number) => {
    store.removeTrigger(index)
}

const onStrategySaved = () => {
    // Optional: Show success message
    console.log('Strategy saved successfully')
}
</script>

<template>
    <div class="space-y-6 animate-fade-in">
        <!-- Top Info Bar -->
        <div
            class="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div class="flex gap-6 text-sm">
                <div>
                    <span class="text-slate-500">回测标的:</span>
                    <span class="ml-2 font-semibold text-slate-900">{{ config.etfSymbol }}</span>
                </div>
                <div>
                    <span class="text-slate-500">时间范围:</span>
                    <span class="ml-2 font-semibold text-slate-900">{{ config.startDate }} 至 {{ config.endDate }}</span>
                </div>
                <div>
                    <span class="text-slate-500">初始本金:</span>
                    <span class="ml-2 font-semibold text-slate-900">${{ config.initialCapital }}</span>
                </div>
            </div>
            <Button variant="outline" size="sm" @click="$emit('edit-setup')">修改设置</Button>
        </div>

        <!-- Triggers List -->
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-slate-900">我的策略触发器</h2>
                <Button @click="showTriggerBuilder = true">
                    <span class="mr-2">+</span> 添加新触发器
                </Button>
            </div>

            <div v-if="triggers.length === 0"
                class="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <p class="text-slate-500">暂无触发器，请点击上方按钮添加。</p>
            </div>

            <div v-else class="space-y-3">
                <Card v-for="(trigger, index) in triggers" :key="index"
                    class="group hover:border-indigo-300 transition-colors">
                    <CardContent class="p-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div
                                class="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                {{ index + 1 }}
                            </div>
                            <span class="text-slate-700 font-medium">{{ formatTrigger(trigger) }}</span>
                        </div>
                        <Button variant="ghost" size="icon" class="text-slate-400 hover:text-red-600"
                            @click="removeTrigger(index)">
                            <i class="fa-solid fa-trash"></i>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>

        <!-- Bottom Action -->
        <div class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-center z-20">
            <div class="max-w-7xl w-full flex justify-end px-4 sm:px-6 lg:px-8 gap-4">
                <Button variant="outline" size="lg" class="w-full sm:w-auto" :disabled="triggers.length === 0"
                    @click="showSaveDialog = true">
                    保存策略
                </Button>
                <Button size="lg" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                    :disabled="triggers.length === 0 || store.isLoading" @click="handleRunBacktest">
                    <span v-if="store.isLoading">运行中...</span>
                    <span v-else>运行回测</span>
                </Button>
            </div>
        </div>

        <!-- Dialogs -->
        <TriggerBuilderDialog v-model:open="showTriggerBuilder" />
        <ResultsReportDialog v-model:open="showResults" />
        <SaveStrategyDialog v-model:open="showSaveDialog" @saved="onStrategySaved" />
    </div>
</template>
