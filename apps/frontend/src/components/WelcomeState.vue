<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'

const authStore = useAuthStore()

const handleStart = async () => {
    try {
        await authStore.signInWithGoogle()
    } catch (error) {
        console.error(error)
    }
}
</script>

<template>
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
        <!-- Background decoration -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10"></div>
        <div class="absolute top-1/2 -right-24 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>

        <div class="py-20 lg:py-32 text-center space-y-8 max-w-4xl mx-auto px-4">
            <div class="space-y-4">
                <h1
                    class="text-5xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-blue-600">
                    智能 ETF 投资策略设计
                </h1>
                <p class="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    无需编写代码，通过直观的“如果...那么...”规则，构建、回测并优化您的量化交易策略。
                    让数据驱动您的投资决策。
                </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg"
                    class="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full transition-all hover:scale-105"
                    @click="handleStart">
                    <i class="fa-brands fa-google mr-2"></i>
                    立即登录开始
                </Button>
                <Button variant="outline" size="lg"
                    class="h-14 px-8 text-lg rounded-full border-slate-300 hover:bg-slate-50">
                    查看演示文档
                </Button>
            </div>
        </div>

        <!-- Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 pb-20">
            <!-- Feature 1 -->
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-chart-line text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-3">可视化回测</h3>
                <p class="text-slate-500 leading-relaxed">
                    实时生成净值曲线，提供夏普比率、最大回撤等专业指标，直观评估策略表现。
                </p>
            </div>

            <!-- Feature 2 -->
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-sliders text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-3">灵活规则引擎</h3>
                <p class="text-slate-500 leading-relaxed">
                    支持多种技术指标（RSI, MA）和价格行为触发器，自由组合买入卖出逻辑。
                </p>
            </div>

            <!-- Feature 3 -->
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-bolt text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-3">极速云端计算</h3>
                <p class="text-slate-500 leading-relaxed">
                    基于 Cloudflare Workers 的高性能边缘计算架构，毫秒级响应，随时随地访问。
                </p>
            </div>
        </div>
    </div>
</template>
