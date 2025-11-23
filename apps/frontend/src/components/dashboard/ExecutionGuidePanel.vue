<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-vue-next'

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
            <CardTitle class="text-base">执行指南</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4 text-sm text-slate-600">
            <div class="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/50 to-blue-50/30 p-4">
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

            <div v-if="hasResult"
                class="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-green-50/50 p-4">
                <p class="text-xs font-bold text-emerald-700 mb-1">✓ 回测完成</p>
                <p class="text-xs text-emerald-600">已有回测结果，可重新运行以刷新表现。</p>
            </div>
        </CardContent>
    </Card>
</template>
