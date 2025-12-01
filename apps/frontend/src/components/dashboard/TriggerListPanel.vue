<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Pencil, Trash2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { triggerSummaries, canEdit, emptyStateMessage } = defineProps<{
    triggerSummaries: Array<{
        id: string
        order: number
        condition: string
        action: string
        cooldown: string
        actionType?: 'buy' | 'sell'
    }>
    canEdit: boolean
    emptyStateMessage: string
}>()

const emit = defineEmits<{
    'open-builder': []
    'edit-trigger': [index: number]
    'remove-trigger': [index: number]
}>()

// 根据动作类型获取序号徽章样式
const getBadgeClass = (actionType?: 'buy' | 'sell') => {
    if (actionType === 'sell') {
        return 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30'
    }
    // 默认绿色（买入）
    return 'bg-gradient-to-br from-lime-600 to-emerald-600 shadow-lime-500/30'
}

// 根据动作类型获取卡片边框样式
const getCardClass = (actionType?: 'buy' | 'sell') => {
    if (actionType === 'sell') {
        return 'border-red-200/40 bg-gradient-to-br from-white via-red-50/50 to-rose-100/40 shadow-red-200/30 hover:shadow-red-300/40'
    }
    return 'border-emerald-200/40 bg-gradient-to-br from-white via-emerald-50/50 to-lime-100/40 shadow-emerald-200/30 hover:shadow-emerald-300/40'
}
</script>

<template>
    <Card
        class="border-slate-200/50 shadow-xl shadow-slate-200/50 flex-1 bg-linear-to-br from-white via-lime-50/60 to-emerald-100/50 backdrop-blur-sm">
        <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>{{ t('strategy.triggerList.title') }}</CardTitle>
                <CardDescription>{{ t('strategy.triggerList.description') }}</CardDescription>
            </div>
            <Button v-if="canEdit" size="sm" class="w-full sm:w-auto" @click="emit('open-builder')">
                {{ t('strategy.triggerList.addTrigger') }}
            </Button>
        </CardHeader>
        <CardContent>
            <div v-if="triggerSummaries.length === 0"
                class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p class="text-slate-500">{{ emptyStateMessage }}</p>
                <Button v-if="canEdit" class="mt-4" @click="emit('open-builder')">{{ t('strategy.triggerList.createNow')
                }}</Button>
            </div>
            <ol v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <li v-for="(summary, index) in triggerSummaries" :key="summary.id"
                    :class="['rounded-2xl border p-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full', getCardClass(summary.actionType)]">
                    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between h-full">
                        <div class="flex items-start gap-3">
                            <span
                                :class="['flex size-8 shrink-0 items-center justify-center rounded-full text-white text-sm font-semibold shadow-lg', getBadgeClass(summary.actionType)]">
                                {{ summary.order }}
                            </span>
                            <div class="space-y-3">
                                <div>
                                    <p class="text-xs uppercase tracking-wide text-slate-400">{{
                                        t('strategy.triggerList.condition') }}</p>
                                    <p class="text-sm font-semibold text-slate-900 mt-1">{{ summary.condition }}
                                    </p>
                                </div>
                                <div class="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <p class="text-xs uppercase tracking-wide text-slate-400">{{
                                            t('strategy.triggerList.action') }}</p>
                                        <p class="text-sm text-slate-800 mt-1">{{ summary.action }}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs uppercase tracking-wide text-slate-400">{{
                                            t('strategy.triggerList.cooldown') }}</p>
                                        <p class="text-sm text-slate-800 mt-1">{{ summary.cooldown ||
                                            t('strategy.triggerList.noCooldown') }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="canEdit" class="flex gap-2 self-start">
                            <Button variant="ghost" size="icon"
                                class="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                @click="emit('edit-trigger', index)">
                                <Pencil class="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                                class="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                @click="emit('remove-trigger', index)">
                                <Trash2 class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </li>
            </ol>
        </CardContent>
    </Card>
</template>
