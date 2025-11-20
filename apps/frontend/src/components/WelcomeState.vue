<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const emit = defineEmits(['start-create'])
</script>

<template>
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
        <div class="space-y-4 max-w-2xl">
            <h1 class="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900">
                设计您的 ETF 投资策略
            </h1>
            <p class="text-xl text-slate-500">
                无需编程，通过简单的“如果...那么...”规则，构建并回测您的量化交易策略。
            </p>
        </div>

        <Card class="w-full max-w-md shadow-lg border-slate-200">
            <CardHeader>
                <CardTitle>开始新的回测</CardTitle>
                <CardDescription>选择一个标的，设定规则，查看历史表现。</CardDescription>
            </CardHeader>
            <CardContent>
                <Button size="lg" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    @click="emit('start-create')">
                    <span class="mr-2">+</span> 创建新策略回测
                </Button>
            </CardContent>
        </Card>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl w-full mt-8">
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
                <div class="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <i class="fa-solid fa-chart-line"></i>
                </div>
                <h3 class="font-semibold text-slate-900">可视化回测</h3>
                <p class="text-sm text-slate-500 mt-1">直观的净值曲线和关键指标对比。</p>
            </div>
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
                <div class="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-3">
                    <i class="fa-solid fa-sliders"></i>
                </div>
                <h3 class="font-semibold text-slate-900">灵活的规则</h3>
                <p class="text-sm text-slate-500 mt-1">支持多种技术指标和价格行为触发器。</p>
            </div>
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
                <div class="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                    <i class="fa-solid fa-bolt"></i>
                </div>
                <h3 class="font-semibold text-slate-900">极速引擎</h3>
                <p class="text-sm text-slate-500 mt-1">基于 Cloudflare Workers 的高性能计算。</p>
            </div>
        </div>
    </div>
</template>
