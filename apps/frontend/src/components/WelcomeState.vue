<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'

const { t } = useI18n({ useScope: 'global' })
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
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-lime-100 rounded-full blur-3xl opacity-50 -z-10"></div>
        <div class="absolute top-1/2 -right-24 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50 -z-10"></div>

        <div class="py-16 text-center space-y-10 max-w-5xl mx-auto px-4">
            <!-- Main Title & Tagline -->
            <div class="space-y-6">
                <div
                    class="inline-flex items-center gap-2 px-4 py-2 bg-lime-50 border border-lime-200 rounded-full text-lime-700 font-semibold text-sm mb-4 animate-fade-in">
                    <span class="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></span>
                    VestLab ETF 策略设计器
                </div>

                <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                    <span
                        class="bg-clip-text text-transparent bg-linear-to-r from-slate-900 via-slate-800 to-slate-900">
                        拒绝凭感觉，
                    </span>
                    <br>
                    <span
                        class="bg-clip-text text-transparent bg-linear-to-r from-lime-600 via-emerald-600 to-lime-600">
                        用数据说话
                    </span>
                </h1>

                <p class="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
                    将您的"抄底直觉"转化为可验证的投资策略<br class="hidden sm:block">
                    <span class="text-emerald-600 font-semibold">无需写代码</span>，几秒钟内完成<span
                        class="text-lime-600 font-semibold">十年历史回测</span>
                </p>
            </div>

            <!-- CTA Button -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button size="lg"
                    class="group h-16 px-10 text-lg font-semibold bg-linear-to-r from-lime-600 to-emerald-600 hover:from-lime-700 hover:to-emerald-700 text-white shadow-xl shadow-lime-200/50 rounded-2xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-emerald-300/50"
                    @click="handleStart">
                    <i class="fa-brands fa-google mr-3 text-xl"></i>
                    立即开始验证您的策略
                    <i class="fa-solid fa-arrow-right ml-3 group-hover:translate-x-1 transition-transform"></i>
                </Button>
            </div>

            <!-- Trust Indicators -->
            <div class="flex flex-wrap justify-center items-center gap-8 pt-8 text-sm text-slate-500">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-bolt text-lime-600"></i>
                    <span>秒级回测响应</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-shield-halved text-emerald-600"></i>
                    <span>全球边缘网络</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-chart-line text-purple-600"></i>
                    <span>十年历史数据</span>
                </div>
            </div>
        </div>

        <!-- Core Values Section -->
        <div class="max-w-6xl mx-auto px-4 py-16 space-y-12">
            <div class="text-center space-y-3">
                <h2 class="text-3xl md:text-4xl font-bold text-slate-900">
                    我们的投资哲学
                </h2>
                <p class="text-slate-600 text-lg max-w-2xl mx-auto">
                    不仅提供工具，更倡导一种理性的投资方式
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Value 1: Signal over Schedule -->
                <div
                    class="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-slate-100 hover:border-lime-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div
                        class="absolute top-0 right-0 w-32 h-32 bg-lime-100 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity -z-10">
                    </div>
                    <div
                        class="h-14 w-14 rounded-2xl bg-linear-to-br from-lime-500 to-emerald-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-lime-200 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-signal text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                        🎯 信号驱动，而非日历驱动
                    </h3>
                    <p class="text-slate-600 leading-relaxed mb-4">
                        传统定投是"到时间就买"，无论贵贱。我们主张<strong class="text-lime-700">智能定投</strong>——当市场发出"打折"信号时果断出手。
                    </p>
                    <p class="text-sm text-emerald-700 font-medium">
                        让每一分钱都花在刀刃上
                    </p>
                </div>

                <!-- Value 2: Simplicity in Complexity -->
                <div
                    class="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-slate-100 hover:border-emerald-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div
                        class="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity -z-10">
                    </div>
                    <div
                        class="h-14 w-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                        🧠 化繁为简，人人可用
                    </h3>
                    <p class="text-slate-600 leading-relaxed mb-4">
                        量化交易不应是程序员的专利。我们将复杂算法封装在<strong class="text-emerald-700">自然语言</strong>交互中。
                    </p>
                    <p class="text-sm text-teal-700 font-medium">
                        "如果跌了15%，就买入1000元" —— 就这么简单
                    </p>
                </div>

                <!-- Value 3: Honest Benchmarking -->
                <div
                    class="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-slate-100 hover:border-purple-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div
                        class="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity -z-10">
                    </div>
                    <div
                        class="h-14 w-14 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-scale-balanced text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                        ⚖️ 诚实对比，理性归因
                    </h3>
                    <p class="text-slate-600 leading-relaxed mb-4">
                        策略好不好，比过才知道。我们将您的策略与<strong class="text-purple-700">买入并持有</strong>进行同台竞技。
                    </p>
                    <p class="text-sm text-indigo-700 font-medium">
                        不仅看收益率，更看最大回撤
                    </p>
                </div>
            </div>
        </div>

        <!-- Key Features Grid -->
        <div class="max-w-6xl mx-auto px-4 pb-16 space-y-8">
            <div class="text-center space-y-3">
                <h2 class="text-3xl md:text-4xl font-bold text-slate-900">
                    核心功能亮点
                </h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- Feature 1: Intent-Based Builder -->
                <div
                    class="bg-linear-to-br from-lime-50 to-emerald-50 p-6 rounded-2xl border border-lime-200/50 hover:shadow-lg transition-all hover:scale-105">
                    <div
                        class="h-12 w-12 rounded-xl bg-white text-lime-600 flex items-center justify-center mb-4 shadow-sm">
                        <i class="fa-solid fa-wand-sparkles text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mb-2">✨ 意图导向构建</h3>
                    <p class="text-sm text-slate-700 leading-relaxed">
                        告别晦涩参数，像填空题一样配置策略
                    </p>
                </div>

                <!-- Feature 2: Lightning-Fast Backtest -->
                <div
                    class="bg-linear-to-br from-sky-50 to-blue-50 p-6 rounded-2xl border border-sky-200/50 hover:shadow-lg transition-all hover:scale-105">
                    <div
                        class="h-12 w-12 rounded-xl bg-white text-sky-600 flex items-center justify-center mb-4 shadow-sm">
                        <i class="fa-solid fa-bolt text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mb-2">🚀 极速回测引擎</h3>
                    <p class="text-sm text-slate-700 leading-relaxed">
                        基于全球边缘网络，秒级完成十年回测
                    </p>
                </div>

                <!-- Feature 3: Visual Analytics -->
                <div
                    class="bg-linear-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200/50 hover:shadow-lg transition-all hover:scale-105">
                    <div
                        class="h-12 w-12 rounded-xl bg-white text-purple-600 flex items-center justify-center mb-4 shadow-sm">
                        <i class="fa-solid fa-chart-line text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mb-2">📊 深度可视化报告</h3>
                    <p class="text-sm text-slate-700 leading-relaxed">
                        净值曲线对比，买卖点标记，一目了然
                    </p>
                </div>

                <!-- Feature 4: Smart Risk Control -->
                <div
                    class="bg-linear-to-br from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-200/50 hover:shadow-lg transition-all hover:scale-105">
                    <div
                        class="h-12 w-12 rounded-xl bg-white text-orange-600 flex items-center justify-center mb-4 shadow-sm">
                        <i class="fa-solid fa-shield-halved text-xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mb-2">🛡️ 智能风控</h3>
                    <p class="text-sm text-slate-700 leading-relaxed">
                        冷却期机制，防止下跌途中打光子弹
                    </p>
                </div>
            </div>
        </div>

        <!-- User Journey Section -->
        <div class="max-w-4xl mx-auto px-4 pb-16">
            <div
                class="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-10 md:p-12 text-white shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 w-64 h-64 bg-lime-500 rounded-full blur-3xl opacity-10"></div>
                <div class="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500 rounded-full blur-3xl opacity-10"></div>

                <div class="relative space-y-8">
                    <h2 class="text-3xl md:text-4xl font-bold mb-6">
                        您的投资旅程
                    </h2>

                    <div class="space-y-6">
                        <div class="flex gap-4">
                            <div
                                class="flex-shrink-0 w-10 h-10 rounded-full bg-lime-500 text-white font-bold flex items-center justify-center shadow-lg shadow-lime-500/50">
                                1
                            </div>
                            <div>
                                <h4 class="font-bold text-lg mb-1">定义想法</h4>
                                <p class="text-slate-300">您觉得 QQQ 每次跌 10% 都是机会？</p>
                            </div>
                        </div>

                        <div class="flex gap-4">
                            <div
                                class="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shadow-lg shadow-emerald-500/50">
                                2
                            </div>
                            <div>
                                <h4 class="font-bold text-lg mb-1">构建策略</h4>
                                <p class="text-slate-300">在设计器中输入规则：IF 从高点回撤 10% THEN 买入 $1000</p>
                            </div>
                        </div>

                        <div class="flex gap-4">
                            <div
                                class="flex-shrink-0 w-10 h-10 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center shadow-lg shadow-sky-500/50">
                                3
                            </div>
                            <div>
                                <h4 class="font-bold text-lg mb-1">验证历史</h4>
                                <p class="text-slate-300">一键运行，看看过去 10 年这么做的结果如何</p>
                            </div>
                        </div>

                        <div class="flex gap-4">
                            <div
                                class="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center shadow-lg shadow-purple-500/50">
                                4
                            </div>
                            <div>
                                <h4 class="font-bold text-lg mb-1">增强信心</h4>
                                <p class="text-slate-300">看着数据，您不再恐慌下跌，而是期待机会</p>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6">
                        <Button size="lg" variant="outline"
                            class="h-14 px-8 text-lg bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm rounded-xl transition-all hover:scale-105"
                            @click="handleStart">
                            开始您的第一个策略
                            <i class="fa-solid fa-arrow-right ml-2"></i>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
