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
    <!-- Hero Section Container -->
    <div
        class="relative min-h-screen flex items-center overflow-hidden bg-slate-50 font-sans selection:bg-lime-200 selection:text-emerald-900">

        <!-- Global Background Decoration (Light Grid) -->
        <div class="absolute inset-0 z-0 pointer-events-none opacity-20"
            style="background-image: linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px); background-size: 40px 40px;">
        </div>

        <!-- Blob Glow Effects -->
        <div
            class="absolute -top-24 -left-24 w-96 h-96 bg-lime-200 rounded-full blur-[100px] opacity-40 -z-10 animate-pulse">
        </div>
        <div
            class="absolute top-1/2 right-0 w-[500px] h-[500px] bg-emerald-200 rounded-full blur-[120px] opacity-30 -z-10">
        </div>

        <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10 py-12 lg:py-0">

            <!-- LEFT COLUMN: Copywriting -->
            <div class="space-y-8 text-left">
                <!-- Badge -->
                <div
                    class="inline-flex items-center gap-2 px-3 py-1 bg-white border border-lime-200 rounded-full shadow-sm animate-fade-in-up">
                    <span class="relative flex h-2 w-2">
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                    </span>
                    <span class="text-xs font-bold text-slate-600 tracking-wide uppercase">VestLab ETF 策略设计器</span>
                </div>

                <!-- Main Headline -->
                <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                    <span class="block text-slate-900">拒绝凭感觉，</span>
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#84cc16] to-[#059669]">
                        用数据说话
                    </span>
                </h1>

                <!-- Subheadline -->
                <p class="text-lg text-slate-600 leading-relaxed max-w-lg">
                    将您的"抄底直觉"转化为可验证的投资策略。
                    <span class="text-emerald-700 font-semibold bg-emerald-50 px-1 rounded">无需代码</span>，
                    利用全球边缘网络，几秒钟内完成
                    <span class="text-lime-700 font-semibold bg-lime-50 px-1 rounded">十年历史回测</span>。
                </p>

                <!-- CTA Actions -->
                <div class="flex flex-col sm:flex-row gap-4 pt-2">
                    <Button size="lg"
                        class="h-14 px-8 text-base font-bold bg-gradient-to-r from-[#84cc16] to-[#059669] hover:from-[#65a30d] hover:to-[#047857] text-white shadow-xl shadow-lime-200/50 rounded-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-emerald-300/50 active:scale-95 flex items-center gap-3"
                        @click="handleStart">
                        <i class="fa-brands fa-google text-lg"></i>
                        立即开始验证
                        <i class="fa-solid fa-arrow-right opacity-80"></i>
                    </Button>

                    <Button size="lg" variant="outline"
                        class="h-14 px-8 text-base font-bold bg-white border-2 border-slate-100 text-slate-600 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50/50 rounded-xl transition-all"
                        @click="handleStart">
                        查看演示 DEMO
                    </Button>
                </div>

                <!-- Trust Indicators (Aligned Left) -->
                <div
                    class="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 text-sm font-medium text-slate-500 border-t border-slate-200/60 mt-8 w-full">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center text-lime-600">
                            <i class="fa-solid fa-bolt"></i>
                        </div>
                        <span>秒级回测</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div
                            class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <i class="fa-solid fa-database"></i>
                        </div>
                        <span>十年数据</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <i class="fa-solid fa-chart-simple"></i>
                        </div>
                        <span>可视化报告</span>
                    </div>
                </div>
            </div>

            <!-- RIGHT COLUMN: 3D Visual Showcase -->
            <!-- Perspective Container -->
            <div class="relative hidden lg:flex items-center justify-center perspective-container group cursor-pointer"
                style="perspective: 2000px;">

                <!-- The 3D Wrapper (Tilts by default, straightens on hover) -->
                <div class="relative w-full max-w-[600px] aspect-[4/3] transition-all duration-700 ease-out transform preserve-3d group-hover:rotate-x-0 group-hover:rotate-y-0 group-hover:scale-100"
                    style="transform: rotateY(-15deg) rotateX(5deg) scale(0.95);">

                    <!-- Background Glow behind cards -->
                    <div
                        class="absolute inset-0 bg-gradient-to-tr from-lime-400 to-emerald-500 rounded-[2rem] opacity-20 blur-3xl -z-10">
                    </div>

                    <!-- Main Dashboard Card (Center) -->
                    <div
                        class="absolute inset-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-500 group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
                        <!-- Mock Header -->
                        <div
                            class="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
                            <div class="flex gap-2">
                                <div class="w-3 h-3 rounded-full bg-red-400"></div>
                                <div class="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div class="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div class="text-xs font-mono text-slate-400">Strategy_Builder_v1.0</div>
                        </div>
                        <!-- Mock Content -->
                        <div class="p-6 flex-1 flex flex-col gap-4">
                            <!-- Chart Area -->
                            <div
                                class="h-32 w-full bg-gradient-to-r from-lime-50 to-emerald-50 rounded-lg border border-lime-100 relative overflow-hidden">
                                <svg class="absolute bottom-0 w-full h-full text-emerald-500 opacity-20"
                                    viewBox="0 0 400 100" preserveAspectRatio="none">
                                    <path fill="currentColor"
                                        d="M0,80 Q50,90 100,50 T200,60 T300,20 T400,40 V100 H0 Z" />
                                </svg>
                                <svg class="absolute bottom-0 w-full h-full" fill="none" stroke="#059669"
                                    stroke-width="2">
                                    <path d="M0,80 Q50,90 100,50 T200,60 T300,20 T400,40" />
                                </svg>
                            </div>
                            <!-- Metrics Row -->
                            <div class="grid grid-cols-3 gap-4">
                                <div class="bg-slate-50 p-3 rounded-lg">
                                    <div class="text-[10px] text-slate-400">年化收益</div>
                                    <div class="text-lg font-bold text-emerald-600">+22.4%</div>
                                </div>
                                <div class="bg-slate-50 p-3 rounded-lg">
                                    <div class="text-[10px] text-slate-400">夏普比率</div>
                                    <div class="text-lg font-bold text-slate-700">1.82</div>
                                </div>
                                <div class="bg-slate-50 p-3 rounded-lg">
                                    <div class="text-[10px] text-slate-400">最大回撤</div>
                                    <div class="text-lg font-bold text-slate-700">-12.5%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Floating Card 1: Buy Signal (Top Left) -->
                    <div class="absolute -top-6 -left-12 w-48 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-xl border border-emerald-100 transform transition-transform duration-700 ease-out group-hover:translate-x-4 group-hover:translate-y-4"
                        style="transform: translateZ(40px);">
                        <div class="flex items-center gap-3 mb-2">
                            <div
                                class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <i class="fa-solid fa-arrow-trend-up text-xs"></i>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-slate-700">买入信号触发</div>
                                <div class="text-[10px] text-slate-400">QQQ 回撤 > 10%</div>
                            </div>
                        </div>
                        <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500 w-3/4"></div>
                        </div>
                    </div>

                    <!-- Floating Card 2: Strategy Config (Bottom Right) -->
                    <div class="absolute -bottom-8 -right-8 w-56 bg-[#1f2937] text-white rounded-xl p-4 shadow-2xl shadow-slate-900/20 transform transition-transform duration-700 ease-out group-hover:-translate-x-4 group-hover:-translate-y-4"
                        style="transform: translateZ(60px);">
                        <div class="text-xs font-mono text-slate-400 mb-2">// 策略逻辑</div>
                        <div class="space-y-2 font-mono text-xs">
                            <div class="flex gap-2">
                                <span class="text-purple-400">IF</span>
                                <span class="text-white">Drawdown</span>
                                <span class="text-lime-400">> 15%</span>
                            </div>
                            <div class="flex gap-2">
                                <span class="text-purple-400">THEN</span>
                                <span class="text-emerald-400">BUY $1000</span>
                            </div>
                        </div>
                        <div class="mt-3 flex items-center justify-between">
                            <span class="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">Python 3.9</span>
                            <i class="fa-solid fa-code text-slate-500 text-xs"></i>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
/* 3D 效果必备的 CSS */
.preserve-3d {
    transform-style: preserve-3d;
}

/* 如果您没有安装 animate.css，这里补充简单的淡入动画 */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translate3d(0, 20px, 0);
    }

    to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
    }
}

.animate-fade-in-up {
    animation: fadeInUp 0.8s ease-out;
}
</style>