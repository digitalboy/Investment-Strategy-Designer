<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Pencil, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
    triggerSummaries: Array<{
        id: string
        order: number
        condition: string
        action: string
        cooldown: string
    }>
    canEdit: boolean
    emptyStateMessage: string
}>()

const emit = defineEmits<{
    'open-builder': []
    'edit-trigger': [index: number]
    'remove-trigger': [index: number]
}>()
</script>

<template>
    <Card
        class="border-slate-200/50 shadow-xl shadow-slate-200/50 flex-1 bg-linear-to-br from-white via-blue-50/60 to-indigo-100/50 backdrop-blur-sm">
        <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>触发器面板</CardTitle>
                <CardDescription>查看触发顺序并快速调整条件、动作与冷却。</CardDescription>
            </div>
            <Button v-if="canEdit" size="sm" class="w-full sm:w-auto" @click="emit('open-builder')">
                添加触发器
            </Button>
        </CardHeader>
        <CardContent>
            <div v-if="triggerSummaries.length === 0"
                class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p class="text-slate-500">{{ emptyStateMessage }}</p>
                <Button v-if="canEdit" class="mt-4" @click="emit('open-builder')">立即创建</Button>
            </div>
            <ol v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <li v-for="(summary, index) in triggerSummaries" :key="summary.id"
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
