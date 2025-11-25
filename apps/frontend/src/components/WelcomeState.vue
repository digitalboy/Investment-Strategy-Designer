<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
    Layers,
    Settings2,
    Code,
    Zap,
    BarChart3,
    Shield,
    ArrowRight,
    CheckCircle2
} from 'lucide-vue-next'

const authStore = useAuthStore()
const { t } = useI18n()

const slides = computed(() => [
    {
        id: 'intro',
        badge: t('welcome.slides.intro.badge'),
        title: t('welcome.slides.intro.title').split(/[,，]/).map(s => s.trim()),
        desc: t('welcome.slides.intro.desc'),
        icon: Layers,
        visualType: 'dashboard'
    },
    {
        id: 'triggers',
        badge: t('welcome.slides.triggers.badge'),
        title: t('welcome.slides.triggers.title').split(/[,，]/).map(s => s.trim()),
        desc: t('welcome.slides.triggers.desc'),
        icon: Settings2,
        visualType: 'triggers'
    },
    {
        id: 'builder',
        badge: t('welcome.slides.builder.badge'),
        title: t('welcome.slides.builder.title').split(/[,，]/).map(s => s.trim()),
        desc: t('welcome.slides.builder.desc'),
        icon: Code,
        visualType: 'builder'
    },
    {
        id: 'backtest',
        badge: t('welcome.slides.backtest.badge'),
        title: t('welcome.slides.backtest.title').split(/[,，]/).map(s => s.trim()),
        desc: t('welcome.slides.backtest.desc'),
        icon: Zap,
        visualType: 'speed'
    },
    {
        id: 'analytics',
        badge: t('welcome.slides.analytics.badge'),
        title: t('welcome.slides.analytics.title').split(/[,，]/).map(s => s.trim()),
        desc: t('welcome.slides.analytics.desc'),
        icon: BarChart3,
        visualType: 'analytics'
    },
    {
        id: 'risk',
        badge: t('welcome.slides.risk.badge'),
        title: t('welcome.slides.risk.title').split(/[,，]/).map(s => s.trim()),
        desc: t('welcome.slides.risk.desc'),
        icon: Shield,
        visualType: 'risk'
    }
])

const currentSlideIndex = ref(0)
const isPaused = ref(false)
const countDownVal = ref(10)
const countUpVal = ref(0)

const currentSlide = computed(() => slides.value[currentSlideIndex.value]!)

const startAutoAdvance = () => {
    const timer = setInterval(() => {
        if (!isPaused.value) {
            currentSlideIndex.value = (currentSlideIndex.value + 1) % slides.value.length
        }
    }, 4500)
    return timer
}

const stopAutoAdvance = (timer: number) => {
    clearInterval(timer)
}

let autoAdvanceTimer: number

const startCountDown = () => {
    let startTime: number
    const animate = (time: number) => {
        if (!startTime) startTime = time
        const progress = Math.min((time - startTime) / 800, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3)

        countDownVal.value = 0 + (1.2578 - 0) * easeProgress

        if (progress < 1) {
            requestAnimationFrame(animate)
        }
    }

    requestAnimationFrame(animate)
}

const startCountUp = () => {
    let startTime: number
    const animate = (time: number) => {
        if (!startTime) startTime = time
        const rawProgress = (time - startTime) / 3000
        const cycleProgress = rawProgress % 2
        const progress = Math.min(cycleProgress > 1 ? 2 - cycleProgress : cycleProgress, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3)

        countUpVal.value = 0 + (428 - 0) * easeProgress

        requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
}

onMounted(() => {
    autoAdvanceTimer = startAutoAdvance()
    startCountDown()
    startCountUp()
})

onUnmounted(() => {
    stopAutoAdvance(autoAdvanceTimer)
})

const handleStart = async () => {
    try {
        await authStore.signInWithGoogle()
    } catch (error) {
        console.error(error)
    }
}

const goToSlide = (index: number) => {
    currentSlideIndex.value = index
}

const pauseAutoAdvance = () => {
    isPaused.value = true
}

const resumeAutoAdvance = () => {
    isPaused.value = false
}
</script>

<template>
    <!-- Hero Section Container -->
    <div
        class="relative  flex items-center overflow-hidden bg-slate-50 font-sans selection:bg-lime-200 selection:text-emerald-900">

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

        <div
            class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10 py-12 lg:py-0 min-h-[600px]">

            <!-- LEFT COLUMN: Text Carousel -->
            <div class="space-y-8 text-left transition-all duration-500" @mouseenter="pauseAutoAdvance"
                @mouseleave="resumeAutoAdvance">
                <!-- Badge -->
                <div
                    class="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm animate-slide-in-stagger">
                    <span class="relative flex h-2 w-2">
                        <span
                            :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', currentSlide.id === 'risk' ? 'bg-red-400' : 'bg-lime-400']"></span>
                        <span
                            :class="['relative inline-flex rounded-full h-2 w-2', currentSlide.id === 'risk' ? 'bg-red-500' : 'bg-lime-500']"></span>
                    </span>
                    <span class="text-xs font-bold text-slate-600 tracking-wide uppercase">{{ currentSlide.badge
                        }}</span>
                </div>

                <!-- Main Headline -->
                <h1
                    class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] animate-slide-in-stagger">
                    <span class="block text-slate-900">{{ currentSlide.title[0] }}</span>
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#84cc16] to-[#059669]">
                        {{ currentSlide.title[1] }}
                    </span>
                </h1>

                <!-- Subheadline -->
                <p class="text-lg text-slate-600 leading-relaxed max-w-lg animate-slide-in-stagger">
                    {{ currentSlide.desc }}
                </p>

                <!-- Progress Indicators (Clickable) -->
                <div class="flex items-center gap-2 mb-4">
                    <button v-for="(slide, idx) in slides" :key="slide.id" @click="goToSlide(idx)"
                        :class="['h-1.5 rounded-full transition-all duration-500', idx === currentSlideIndex ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-300 hover:bg-slate-400']"
                        :aria-label="`Go to slide ${idx + 1}`"></button>
                </div>

                <!-- CTA Actions -->
                <div class="pt-2 animate-fade-in">
                    <Button size="lg"
                        class="w-full h-14 px-8 text-base font-bold bg-gradient-to-r from-[#84cc16] to-[#059669] hover:from-[#65a30d] hover:to-[#047857] text-white shadow-xl shadow-lime-200/50 rounded-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-emerald-300/50 active:scale-95 flex items-center justify-center gap-3"
                        @click="handleStart">
                        <i class="fa-brands fa-google text-lg"></i>
                        {{ $t('auth.startDesigning') }}
                        <ArrowRight class="w-4 h-4 opacity-80" />
                    </Button>
                </div>
            </div>

            <!-- RIGHT COLUMN: Dynamic 3D Visual Showcase -->
            <div class="relative hidden lg:flex items-center justify-center perspective-container group cursor-pointer"
                style="perspective: 2000px;" @mouseenter="pauseAutoAdvance" @mouseleave="resumeAutoAdvance">

                <!-- The 3D Wrapper -->
                <div class="relative w-full max-w-[600px] aspect-[4/3] transition-all duration-700 ease-out transform preserve-3d group-hover:rotate-x-0 group-hover:rotate-y-0 group-hover:scale-100"
                    style="transform: rotateY(-12deg) rotateX(5deg) scale(0.95);">

                    <!-- Background Glow -->
                    <div :class="['absolute inset-0 bg-gradient-to-tr rounded-[2rem] opacity-20 blur-3xl -z-10 transition-colors duration-1000',
                        currentSlide.visualType === 'risk' ? 'from-orange-400 to-red-500' :
                            currentSlide.visualType === 'speed' ? 'from-blue-400 to-indigo-500' :
                                currentSlide.visualType === 'triggers' ? 'from-teal-400 to-emerald-500' :
                                    currentSlide.visualType === 'analytics' ? 'from-purple-400 to-indigo-500' :
                                        currentSlide.visualType === 'builder' ? 'from-lime-400 to-green-500' :
                                            'from-lime-400 to-emerald-500'
                    ]">
                    </div>

                    <!-- Main Card Container -->
                    <div
                        :class="['absolute inset-0 rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-500',
                            currentSlide.visualType === 'speed' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100']">

                        <!-- Mock Header -->
                        <div
                            :class="['h-14 border-b flex items-center justify-between px-6',
                                currentSlide.visualType === 'speed' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-100']">
                            <div class="flex gap-2">
                                <div class="w-3 h-3 rounded-full bg-red-400"></div>
                                <div class="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div class="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div :class="['text-xs font-mono flex items-center gap-2',
                                currentSlide.visualType === 'speed' ? 'text-emerald-500' : 'text-slate-400']">
                                <component :is="currentSlide.icon" class="w-3 h-3" />
                                VestLab_{{ currentSlide.id.toUpperCase() }}.exe
                            </div>
                        </div>

                        <!-- Dynamic Content Area -->
                        <div class="p-6 flex-1 flex flex-col gap-4 justify-center relative overflow-hidden">

                            <!-- Dashboard Visual -->
                            <div v-if="currentSlide.visualType === 'dashboard'"
                                class="animate-fade-in w-full h-full flex items-center justify-center relative">
                                <!-- Financial Grid Background -->
                                <div class="absolute inset-0 z-0"
                                    style="background-image: linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px); background-size: 24px 24px; opacity: 0.6;">
                                </div>

                                <!-- Floating Stats with CountUp -->
                                <div class="absolute top-0 left-0 animate-fade-in-up z-20">
                                    <div
                                        class="text-5xl font-black text-emerald-500 tracking-tighter bg-white/60 backdrop-blur-sm px-2 rounded-lg border border-white/50 shadow-sm">
                                        +{{ Math.floor(countUpVal) }}%
                                    </div>
                                    <div class="text-xs font-bold text-slate-400 tracking-widest pl-3 mt-1">ALL TIME
                                        HIGH</div>
                                </div>

                                <!-- The Bold Line Chart & Following Arrow -->
                                <svg class="w-full h-full overflow-visible relative z-10" viewBox="0 0 400 300">
                                    <defs>
                                        <linearGradient id="growthGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stop-color="#84cc16" />
                                            <stop offset="100%" stop-color="#059669" />
                                        </linearGradient>
                                        <filter id="glow">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    <!-- The Path Definition -->
                                    <path id="trendPath" d="M0,250 C100,240 150,260 200,180 S300,100 380,50" fill="none"
                                        stroke="url(#growthGradient)" stroke-width="12" stroke-linecap="round"
                                        class="animate-draw-line" filter="url(#glow)" stroke-dasharray="600"
                                        stroke-dashoffset="0" />

                                    <!-- The Moving Arrow Group -->
                                    <g class="animate-follow-path"
                                        style="offset-path: path('M0,250 C100,240 150,260 200,180 S300,100 380,50'); offset-rotate: auto;">
                                        <g style="transform: rotate(0deg) translate(-5px, 0);">
                                            <path d="M-10,10 L10,0 L-10,-10" fill="none" stroke="#059669"
                                                stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
                                            <circle cx="0" cy="0" r="8" fill="#10b981"
                                                class="animate-ping opacity-75" />
                                        </g>
                                    </g>
                                </svg>
                            </div>

                            <!-- Speed Visual -->
                            <div v-if="currentSlide.visualType === 'speed'"
                                class="animate-fade-in absolute inset-0 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
                                <!-- Brighter, more opaque data streams -->
                                <div
                                    class="absolute inset-0 flex flex-col justify-evenly opacity-60 select-none pointer-events-none">
                                    <div class="animate-scroll flex" style="animation-duration: 10s;">
                                        <span class="mx-4 text-emerald-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                    </div>
                                    <div class="animate-scroll flex animate-reverse" style="animation-duration: 8s;">
                                        <span class="mx-4 text-emerald-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                    </div>
                                    <div class="animate-scroll flex" style="animation-duration: 5s;">
                                        <span class="mx-4 text-cyan-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-cyan-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-cyan-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-cyan-400 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                    </div>
                                    <div class="animate-scroll flex animate-reverse" style="animation-duration: 12s;">
                                        <span class="mx-4 text-emerald-200 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-200 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-200 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-emerald-200 font-mono text-[10px]">QQQ 345.20 ▲ +1.2%
                                            NVDA 450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲
                                            +1.1% TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                    </div>
                                    <div class="animate-scroll flex" style="animation-duration: 6s;">
                                        <span class="mx-4 text-white font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-white font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-white font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-white font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                    </div>
                                    <div class="animate-scroll flex animate-reverse" style="animation-duration: 9s;">
                                        <span class="mx-4 text-cyan-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-cyan-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-cyan-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                        <span class="mx-4 text-cyan-300 font-mono text-[10px]">QQQ 345.20 ▲ +1.2% NVDA
                                            450.00 ▲ +2.4% SPY 410.50 ▼ -0.5% AAPL 175.30 ▲ +0.8% MSFT 320.10 ▲ +1.1%
                                            TSLA 240.50 ▼ -1.2% GOOGL 135.20 ▲ +0.5% AMZN 130.40 ▲ +0.9%</span>
                                    </div>
                                </div>

                                <div class="relative z-10 flex flex-col items-center">
                                    <div class="relative mb-2">
                                        <div class="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/50 animate-spin"
                                            style="animation-duration: 8s;"></div>
                                        <div class="absolute inset-2 rounded-full border-2 border-dotted border-cyan-300/50 animate-spin"
                                            style="animation-duration: 4s; animation-direction: reverse;"></div>

                                        <div
                                            class="bg-slate-900/80 backdrop-blur-md px-8 py-6 rounded-2xl border border-emerald-400/80 shadow-[0_0_50px_rgba(52,211,153,0.4)] text-center relative overflow-hidden">
                                            <!-- Core Pulse -->
                                            <div class="absolute inset-0 bg-emerald-400/20 animate-pulse"></div>
                                            <div
                                                class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-300 to-cyan-300 tabular-nums tracking-tighter relative z-10 shadow-white drop-shadow-lg">
                                                {{ countDownVal.toFixed(4) }}<span class="text-2xl">S</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        class="text-emerald-300 font-mono text-xs tracking-[0.2em] animate-pulse font-bold shadow-emerald-500 drop-shadow-md">
                                        PROCESSING 10Y DATA</div>
                                </div>
                            </div>

                            <!-- Triggers Visual -->
                            <div v-if="currentSlide.visualType === 'triggers'"
                                class="animate-fade-in h-full bg-slate-50 rounded-lg p-6 flex flex-col justify-center gap-6 relative overflow-hidden">

                                <div class="absolute inset-0 opacity-5"
                                    style="background-image: radial-gradient(circle at 2px 2px, #64748b 1px, transparent 0); background-size: 20px 20px;">
                                </div>

                                <!-- 1. RSI Knob -->
                                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between animate-slide-in-right"
                                    style="animation-delay: 0ms;">
                                    <div>
                                        <div class="text-[10px] text-slate-400 font-bold tracking-wider">RSI PERIOD
                                        </div>
                                        <div class="relative h-8 w-16 overflow-hidden">
                                            <div
                                                class="text-2xl font-mono font-bold text-slate-700 absolute top-0 left-0 animate-value-switch">
                                                14</div>
                                            <div
                                                class="text-2xl font-mono font-bold text-emerald-600 absolute top-0 left-0 animate-value-switch-alt opacity-0">
                                                15</div>
                                        </div>
                                    </div>
                                    <div
                                        class="relative w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shadow-inner">
                                        <div class="w-full h-full rounded-full animate-knob-turn shadow-sm">
                                            <div class="w-1.5 h-3 bg-emerald-500 rounded-full mx-auto mt-1"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 2. Stop Loss Slider -->
                                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-slide-in-right"
                                    style="animation-delay: 100ms;">
                                    <div class="flex justify-between mb-2">
                                        <div class="text-[10px] text-slate-400 font-bold tracking-wider">STOP LOSS</div>
                                        <div class="font-mono font-bold text-red-500 animate-pulse">-8.5%</div>
                                    </div>
                                    <div class="h-2 bg-slate-100 rounded-full relative overflow-hidden">
                                        <div
                                            class="absolute top-0 left-0 h-full bg-red-400 w-1/3 rounded-full animate-slider-move shadow-[0_0_10px_rgba(248,113,113,0.5)]">
                                        </div>
                                    </div>
                                </div>

                                <!-- 3. Take Profit Slider -->
                                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-slide-in-right"
                                    style="animation-delay: 200ms;">
                                    <div class="flex justify-between mb-2">
                                        <div class="text-[10px] text-slate-400 font-bold tracking-wider">TAKE PROFIT
                                        </div>
                                        <div class="font-mono font-bold text-emerald-500 animate-pulse">+15.0%</div>
                                    </div>
                                    <div class="h-2 bg-slate-100 rounded-full relative overflow-hidden">
                                        <div
                                            class="absolute top-0 left-0 h-full bg-emerald-400 w-2/3 rounded-full animate-slider-move-reverse shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <!-- Builder Visual -->
                            <div v-if="currentSlide.visualType === 'builder'"
                                class="h-full bg-slate-50 rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">
                                <div class="absolute inset-0"
                                    style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 20px 20px; opacity: 0.5;">
                                </div>
                                <div
                                    class="absolute top-10 right-10 text-orange-400 opacity-10 font-black text-6xl select-none -rotate-12">
                                    OR</div>
                                <div
                                    class="absolute bottom-10 left-10 text-blue-400 opacity-10 font-black text-6xl select-none rotate-6">
                                    ELSE</div>

                                <div class="relative z-10 flex flex-col gap-4 w-full max-w-[320px]">

                                    <!-- Block 1 -->
                                    <div class="bg-white border-l-4 border-blue-500 shadow-md rounded-r-lg p-4 flex items-center gap-4 transform transition-all animate-slide-in-right"
                                        style="animation-delay: 0ms;">
                                        <div
                                            class="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs tracking-wider">
                                            IF</div>
                                        <div class="text-sm font-medium text-slate-700">价格跌破 20 日均线</div>
                                    </div>

                                    <!-- Connection Line 1 -->
                                    <div class="h-6 w-0.5 bg-slate-300 ml-8 origin-top animate-grow-height"
                                        style="animation-delay: 300ms;"></div>

                                    <!-- Block 2 -->
                                    <div class="bg-white border-l-4 border-purple-500 shadow-md rounded-r-lg p-4 flex items-center gap-4 transform transition-all animate-slide-in-right ml-4"
                                        style="animation-delay: 500ms;">
                                        <div
                                            class="bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded text-xs tracking-wider">
                                            AND</div>
                                        <div class="text-sm font-medium text-slate-700">RSI &lt; 30 (超卖)</div>
                                    </div>

                                    <!-- Connection Line 2 -->
                                    <div class="h-6 w-0.5 bg-slate-300 ml-12 origin-top animate-grow-height"
                                        style="animation-delay: 800ms;"></div>

                                    <!-- Block 3 -->
                                    <div class="bg-white border-l-4 border-emerald-500 shadow-md rounded-r-lg p-4 flex items-center gap-4 transform transition-all animate-slide-in-right ml-8"
                                        style="animation-delay: 1000ms;">
                                        <div
                                            class="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded text-xs tracking-wider">
                                            THEN</div>
                                        <div class="text-sm font-medium text-slate-700">买入 $1000 QQQ</div>
                                        <CheckCircle2 class="w-4 h-4 text-emerald-500 ml-auto animate-ping"
                                            style="animation-delay: 1500ms; animation-duration: 2s;" />
                                    </div>

                                </div>
                            </div> <!-- Analytics Visual -->
                            <div v-if="currentSlide.visualType === 'analytics'"
                                class="animate-fade-in h-full bg-slate-50 rounded-lg p-3 flex flex-col gap-3 overflow-hidden relative">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                            QQQ</div>
                                        <span class="text-xs font-bold text-slate-700">Backtest Results</span>
                                    </div>
                                    <div class="text-[10px] text-slate-400">2020 - 2024</div>
                                </div>

                                <div class="grid grid-cols-2 gap-2">
                                    <div class="bg-white p-2 rounded border border-emerald-100 shadow-sm relative overflow-hidden animate-slide-in-up"
                                        style="animation-delay: 100ms;">
                                        <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                        <div class="text-[9px] text-slate-400 mb-0.5 pl-2">MY STRATEGY</div>
                                        <div class="flex justify-between items-end pl-2">
                                            <div>
                                                <div class="text-lg font-bold text-emerald-600 leading-none">+126.4%
                                                </div>
                                                <div class="text-[9px] text-emerald-600/70 mt-0.5">Total Return</div>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-xs font-bold text-slate-700">0.83</div>
                                                <div class="text-[9px] text-slate-400">Sharpe</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="bg-slate-100/50 p-2 rounded border border-slate-200 relative animate-slide-in-up"
                                        style="animation-delay: 200ms;">
                                        <div class="text-[9px] text-slate-400 mb-0.5">BENCHMARK (HOLD)</div>
                                        <div class="flex justify-between items-end">
                                            <div>
                                                <div class="text-lg font-bold text-slate-500 leading-none">+85.2%</div>
                                                <div class="text-[9px] text-slate-400 mt-0.5">Total Return</div>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-xs font-bold text-slate-500">0.65</div>
                                                <div class="text-[9px] text-slate-400">Sharpe</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex-1 bg-white rounded border border-slate-100 relative p-2 shadow-inner animate-fade-in"
                                    style="animation-delay: 300ms;">
                                    <div class="absolute top-2 right-2 flex gap-2 text-[8px]">
                                        <div class="flex items-center gap-1">
                                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Strategy
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>Hold
                                        </div>
                                    </div>

                                    <svg class="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
                                        <line x1="0" y1="30" x2="300" y2="30" stroke="#f1f5f9" stroke-width="1" />
                                        <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f5f9" stroke-width="1" />
                                        <line x1="0" y1="90" x2="300" y2="90" stroke="#f1f5f9" stroke-width="1" />

                                        <path
                                            d="M0,80 L20,75 L40,85 L60,70 L90,65 L120,75 L150,55 L180,60 L210,50 L240,55 L270,45 L300,40"
                                            fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3" />

                                        <path
                                            d="M0,80 L20,78 L40,76 L60,70 L90,55 L120,50 L150,40 L180,35 L210,32 L240,25 L270,20 L300,10"
                                            fill="none" stroke="#8b5cf6" stroke-width="2" />

                                        <defs>
                                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.1" />
                                                <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M0,80 L20,78 L40,76 L60,70 L90,55 L120,50 L150,40 L180,35 L210,32 L240,25 L270,20 L300,10 V120 H0 Z"
                                            fill="url(#chartGrad)" stroke="none" />

                                        <path d="M40,90 L44,83 L48,90 Z" fill="#10b981" />
                                        <path d="M120,80 L124,73 L128,80 Z" fill="#10b981" />

                                        <path d="M150,35 L154,42 L158,35 Z" fill="#ef4444" />
                                    </svg>

                                    <div
                                        class="absolute top-1/3 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white p-2 rounded shadow-xl text-[10px] z-10 pointer-events-none animate-bounce-subtle">
                                        <div class="font-bold border-b border-slate-600 pb-1 mb-1">2023-10-15</div>
                                        <div class="flex justify-between gap-3">
                                            <span class="text-emerald-400">My Strategy:</span>
                                            <span>$12,450</span>
                                        </div>
                                        <div class="flex justify-between gap-3 text-slate-400">
                                            <span>Benchmark:</span>
                                            <span>$10,200</span>
                                        </div>
                                        <div
                                            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 transform rotate-45">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Risk Visual -->
                            <div v-if="currentSlide.visualType === 'risk'"
                                class="animate-fade-in flex flex-col items-center justify-center h-full gap-4">
                                <div
                                    class="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center relative overflow-hidden border-2 border-orange-100">
                                    <Shield class="w-12 h-12 text-orange-500 relative z-10" />
                                    <!-- Scanning Effect -->
                                    <div
                                        class="absolute top-0 left-0 w-full h-1 bg-white/80 shadow-[0_0_10px_white] animate-scan z-20">
                                    </div>
                                    <div
                                        class="absolute -bottom-2 bg-white px-2 py-1 rounded-full shadow-md border border-slate-100 flex items-center gap-1 z-30">
                                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span class="text-[10px] font-bold text-slate-600">SAFE</span>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4 w-full">
                                    <div class="bg-red-50 p-3 rounded-lg text-center border border-red-100 animate-scale-in"
                                        style="animation-delay: 200ms;">
                                        <div class="text-[10px] text-red-400 uppercase">Max Drawdown</div>
                                        <div class="text-xl font-bold text-red-600">-8.5%</div>
                                    </div>
                                    <div class="bg-orange-50 p-3 rounded-lg text-center border border-orange-100 animate-scale-in"
                                        style="animation-delay: 400ms;">
                                        <div class="text-[10px] text-orange-400 uppercase">Recovery Factor</div>
                                        <div class="text-xl font-bold text-orange-600">4.2x</div>
                                    </div>
                                </div>
                            </div>
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

/* 动画类 */
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
    animation: fadeInUp 0.5s ease-out forwards;
}

/* New: Staggered slide in from right */
@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(20px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.animate-slide-in-right {
    animation: slideInRight 0.5s ease-out forwards;
    opacity: 0;
    /* Start hidden for stagger */
}

/* New: Staggered slide in from bottom for text */
@keyframes slideInStagger {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-slide-in-stagger {
    animation: slideInStagger 0.6s ease-out forwards;
    opacity: 0;
}

@keyframes growHeight {
    from {
        transform: scaleY(0);
    }

    to {
        transform: scaleY(1);
    }
}

.animate-grow-height {
    animation: growHeight 0.4s ease-out forwards;
    transform: scaleY(0);
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-scale-in {
    animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    opacity: 0;
}

@keyframes scan {
    0% {
        top: -10%;
        opacity: 0;
    }

    50% {
        opacity: 1;
    }

    100% {
        top: 110%;
        opacity: 0;
    }
}

.animate-scan {
    animation: scan 2s ease-in-out infinite;
}

@keyframes floatSlow {

    0%,
    100% {
        transform: translate(0, 0);
    }

    50% {
        transform: translate(10px, 15px);
    }
}

.animate-float-slow {
    animation: floatSlow 8s ease-in-out infinite;
}

@keyframes floatSlower {

    0%,
    100% {
        transform: translate(0, 0);
    }

    50% {
        transform: translate(-15px, -10px);
    }
}

.animate-float-slower {
    animation: floatSlower 12s ease-in-out infinite;
}

.animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-slide-in-up {
    animation: slideInUp 0.5s ease-out forwards;
    opacity: 0;
}

@keyframes bounceSubtle {

    0%,
    100% {
        transform: translate(-50%, 0);
    }

    50% {
        transform: translate(-50%, -5px);
    }
}

.animate-bounce-subtle {
    animation: bounceSubtle 3s ease-in-out infinite;
}

/* Existing Animations */
@keyframes dash {
    0% {
        stroke-dashoffset: 377;
    }

    50% {
        stroke-dashoffset: 100;
    }

    100% {
        stroke-dashoffset: 377;
    }
}

@keyframes loading {
    0% {
        width: 0%;
        transform: translateX(0);
    }

    50% {
        width: 100%;
        transform: translateX(0);
    }

    100% {
        width: 0%;
        transform: translateX(100%);
    }
}

@keyframes scroll {
    from {
        transform: translateX(0);
    }

    to {
        transform: translateX(-50%);
    }
}

.animate-scroll {
    animation: scroll linear infinite;
}

.animate-reverse {
    animation-direction: reverse;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes drawLine {
    0% {
        stroke-dashoffset: 600;
    }

    100% {
        stroke-dashoffset: 0;
    }
}

.animate-draw-line {
    animation: drawLine 3s ease-in-out infinite alternate;
}

@keyframes followPath {
    0% {
        offset-distance: 0%;
    }

    100% {
        offset-distance: 100%;
    }
}

.animate-follow-path {
    animation: followPath 3s ease-in-out infinite alternate;
}

@keyframes knobTurn {
    0% {
        transform: rotate(-30deg);
    }

    50% {
        transform: rotate(30deg);
    }

    100% {
        transform: rotate(-30deg);
    }
}

.animate-knob-turn {
    animation: knobTurn 4s ease-in-out infinite;
}

@keyframes sliderMove {
    0% {
        width: 30%;
    }

    50% {
        width: 60%;
    }

    100% {
        width: 30%;
    }
}

.animate-slider-move {
    animation: sliderMove 5s ease-in-out infinite;
}

@keyframes sliderMoveReverse {
    0% {
        width: 60%;
    }

    50% {
        width: 30%;
    }

    100% {
        width: 60%;
    }
}

.animate-slider-move-reverse {
    animation: sliderMoveReverse 6s ease-in-out infinite;
}

@keyframes valueSwitch {

    0%,
    45% {
        opacity: 1;
        transform: translateY(0);
    }

    50%,
    100% {
        opacity: 0;
        transform: translateY(-10px);
    }
}

.animate-value-switch {
    animation: valueSwitch 4s infinite;
}

@keyframes valueSwitchAlt {

    0%,
    45% {
        opacity: 0;
        transform: translateY(10px);
    }

    50%,
    100% {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-value-switch-alt {
    animation: valueSwitchAlt 4s infinite;
}
</style>