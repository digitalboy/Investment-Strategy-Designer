<script setup lang="ts">
defineProps<{
    text?: string
    fullscreen?: boolean
}>()
</script>

<template>
    <div :class="[
        'flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px] transition-all duration-300',
        fullscreen ? 'fixed inset-0 z-50' : 'w-full h-full min-h-[200px] py-12'
    ]">
        <div class="relative w-48 h-24">
            <!-- Grid lines -->
            <div class="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-0 opacity-10">
                <div v-for="i in 18" :key="i" class="border-r border-b border-emerald-900 last:border-r-0"></div>
            </div>

            <!-- Chart SVG -->
            <svg viewBox="0 0 120 60" class="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.2" />
                        <stop offset="100%" stop-color="#4f46e5" stop-opacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <!-- Area under the line -->
                <path d="M0 50 L15 45 L30 52 L45 35 L60 40 L75 25 L90 30 L105 15 L120 20 V 60 H 0 Z"
                    fill="url(#gradient)" class="area-anim" />

                <!-- The Line -->
                <path d="M0 50 L15 45 L30 52 L45 35 L60 40 L75 25 L90 30 L105 15 L120 20" fill="none" stroke="#4f46e5"
                    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="line-anim"
                    filter="url(#glow)" />

                <!-- The Dot at the end -->
                <g class="dot-anim">
                    <circle cx="120" cy="20" r="4" fill="#4f46e5" opacity="0.5" class="animate-ping" />
                    <circle cx="120" cy="20" r="2.5" fill="#4f46e5" stroke="white" stroke-width="1" />
                </g>
            </svg>
        </div>

        <div class="mt-6 flex flex-col items-center gap-1">
            <p class="text-sm font-semibold text-emerald-600 tracking-wide animate-pulse">{{ text || '正在分析市场数据...' }}
            </p>
            <div class="flex gap-1 mt-1">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style="animation-delay: 150ms">
                </div>
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style="animation-delay: 300ms">
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.line-anim {
    stroke-dasharray: 160;
    stroke-dashoffset: 160;
    animation: drawLine 2s ease-in-out infinite;
}

.area-anim {
    opacity: 0;
    animation: fadeInArea 2s ease-in-out infinite;
}

.dot-anim {
    opacity: 0;
    animation: fadeInDot 2s ease-in-out infinite;
}

@keyframes drawLine {
    0% {
        stroke-dashoffset: 160;
    }

    40% {
        stroke-dashoffset: 0;
    }

    100% {
        stroke-dashoffset: 0;
    }
}

@keyframes fadeInArea {
    0% {
        opacity: 0;
    }

    40% {
        opacity: 1;
    }

    80% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}

@keyframes fadeInDot {
    0% {
        opacity: 0;
    }

    35% {
        opacity: 0;
    }

    40% {
        opacity: 1;
    }

    100% {
        opacity: 1;
    }
}
</style>
