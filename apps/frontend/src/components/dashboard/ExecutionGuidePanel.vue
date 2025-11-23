<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { statusBadge, hasResult, canEdit } = defineProps<{
    statusBadge: {
        label: string
        description: string
        classes: string
    }
    hasResult: boolean
    canEdit: boolean
}>()
</script>

<template>
    <Card
        class="border-slate-200/50 shadow-xl shadow-slate-200/50 bg-linear-to-br from-white via-violet-50/55 to-purple-100/45 backdrop-blur-sm">
        <CardHeader class="pb-4">
            <CardTitle class="text-base">{{ t('strategy.executionGuide.title') }}</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4 text-sm text-slate-600">
            <div class="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/50 to-blue-50/30 p-4">
                <div class="flex items-center gap-2 mb-2">
                    <Activity class="h-4 w-4 text-indigo-600" />
                    <span class="font-semibold text-slate-900">{{ t('strategy.executionGuide.currentStatus') }}</span>
                </div>
                <p class="text-xs text-slate-600 leading-relaxed">{{ statusBadge?.description ||
                    t('strategy.executionGuide.noIssues') }}
                </p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 space-y-2">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{
                    t('strategy.executionGuide.tips') }}</p>
                <ul class="space-y-2">
                    <li class="flex gap-2 text-xs text-slate-600">
                        <span class="text-indigo-500">•</span>
                        {{ t('strategy.executionGuide.executionTiming') }}
                    </li>
                    <li class="flex gap-2 text-xs text-slate-600">
                        <span class="text-indigo-500">•</span>
                        {{ t('strategy.executionGuide.conditionActionPair') }}
                    </li>
                    <li class="flex gap-2 text-xs text-slate-600">
                        <span class="text-indigo-500">•</span>
                        {{ t('strategy.executionGuide.confirmParameters') }}
                    </li>
                    <li v-if="canEdit" class="flex gap-2 text-xs text-slate-600">
                        <span class="text-indigo-500">•</span>
                        {{ t('strategy.executionGuide.reuseStrategy') }}
                    </li>
                </ul>
            </div>

            <div v-if="hasResult"
                class="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-green-50/50 p-4">
                <p class="text-xs font-bold text-emerald-700 mb-1">{{ t('strategy.executionGuide.backtestCompleted') }}
                </p>
                <p class="text-xs text-emerald-600">{{ t('strategy.executionGuide.backtestResultsAvailable') }}</p>
            </div>
        </CardContent>
    </Card>
</template>
