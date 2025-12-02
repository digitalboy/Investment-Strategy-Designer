<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
// import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import Navbar from '@/components/Navbar.vue'
import NewsTicker from '@/components/NewsTicker.vue'
import { Toaster } from '@/components/ui/sonner'

// const { t } = useI18n({ useScope: 'global' })
const languageStore = useLanguageStore()
const authStore = useAuthStore()
const forceRerenderKey = ref(0) // 用于强制组件重新渲染

// 监听语言变化并强制组件重新渲染以确保UI更新
watch(
  () => languageStore.currentLanguage,
  () => {
    // 强制组件重新渲染以确保UI更新
    forceRerenderKey.value += 1;
  },
  { immediate: true }
);

onMounted(() => {
  authStore.init()
})
</script>

<template>
  <div :key="forceRerenderKey" class="min-h-screen font-sans text-slate-900 relative">
    <!-- Toaster for notifications -->
    <Toaster position="top-center" rich-colors close-button />

    <!-- 动态背景装饰 - 固定全屏覆盖 -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <!-- 基础渐变背景 -->
      <div class="absolute inset-0 bg-linear-to-br from-slate-50 via-lime-50/30 to-emerald-50/40"></div>

      <!-- 主渐变光晕 -->
      <div
        class="absolute top-0 right-0 w-[120vw] h-screen bg-linear-to-br from-lime-200/40 via-emerald-200/30 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 animate-pulse-slow">
      </div>
      <div
        class="absolute bottom-0 left-0 w-screen h-[80vh] bg-linear-to-tr from-emerald-200/30 via-lime-200/20 to-transparent rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/4 animate-pulse-slower">
      </div>

      <!-- 透视网格背景 -->
      <div
        class="absolute inset-x-[-20%] bottom-[-10%] top-[10%] origin-[50%_0%] -skew-y-6 bg-[linear-gradient(to_right,rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_90%_70%_at_50%_10%,#000_70%,transparent_110%)]">
      </div>

      <!-- 增长走势折线：从左到右贯穿全屏，分段向上 -->
      <svg
        class="absolute left-0 right-0 w-screen bottom-0 h-[260px] text-emerald-400/80 drop-shadow-[0_0_18px_rgba(16,185,129,0.55)]"
        viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <!-- 折线下方柔和渐变填充 -->
          <linearGradient id="trend-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(129,140,248,0.06)" />
            <stop offset="35%" stop-color="rgba(56,189,248,0.10)" />
            <stop offset="70%" stop-color="rgba(52,211,153,0.16)" />
            <stop offset="100%" stop-color="rgba(52,211,153,0.0)" />
          </linearGradient>
          <!-- 折线描边渐变：由冷到暖，象征收益增强 -->
          <linearGradient id="trend-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="rgba(129,140,248,0.65)" />
            <stop offset="40%" stop-color="rgba(56,189,248,0.9)" />
            <stop offset="100%" stop-color="rgba(52,211,153,1)" />
          </linearGradient>
        </defs>

        <!-- 填充区域：由多段折线围成的“收益面积” -->
        <path d="M0 320
             L 160 310
             L 300 290
             L 420 265
             L 560 250
             L 680 225
             L 820 205
             L 960 185
             L 1110 155
             L 1280 125
             L 1440 95
             L 1440 400
             L 0 400 Z" fill="url(#trend-fill)" />

        <!-- 走势主折线 -->
        <polyline points="0,320 160,310 300,290 420,265 560,250 680,225 820,205 960,185 1110,155 1280,125 1440,95"
          fill="none" stroke="url(#trend-stroke)" stroke-width="3" stroke-linecap="round" class="animate-trend-line" />

        <!-- 关键节点高亮 -->
        <circle cx="160" cy="310" r="4" class="fill-sky-300/90" />
        <circle cx="420" cy="265" r="4" class="fill-sky-300/90" />
        <circle cx="680" cy="225" r="4" class="fill-sky-300/90" />
        <circle cx="960" cy="185" r="4" class="fill-emerald-300/90" />
        <circle cx="1280" cy="125" r="4" class="fill-emerald-300/90" />
      </svg>
    </div>

    <!-- 导航栏 -->
    <Navbar class="relative z-30" />

    <!-- 主要内容区域 -->
    <main class="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <!-- 视图过渡容器 -->
      <RouterView v-slot="{ Component }">
        <Transition mode="out-in" enter-active-class="transition-all duration-500 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-8" enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-300 ease-in" leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- News Ticker (Fixed Bottom) -->
    <NewsTicker />
  </div>
</template>

<style scoped>
@keyframes pulse-slow {

  0%,
  100% {
    opacity: 0.4;
    transform: translate(33%, -33%) scale(1);
  }

  50% {
    opacity: 0.6;
    transform: translate(33%, -33%) scale(1.05);
  }
}

@keyframes pulse-slower {

  0%,
  100% {
    opacity: 0.3;
    transform: translate(-25%, 25%) scale(1);
  }

  50% {
    opacity: 0.5;
    transform: translate(-25%, 25%) scale(1.08);
  }
}

@keyframes shimmer {
  0% {
    background-position: -250% 0;
  }

  100% {
    background-position: 250% 0;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 8s ease-in-out infinite;
}

.animate-pulse-slower {
  animation: pulse-slower 10s ease-in-out infinite;
}

.animate-shimmer {
  animation: shimmer 8s ease-in-out infinite;
}

@keyframes trend-line-dash {
  0% {
    stroke-dasharray: 180 520;
    stroke-dashoffset: 260;
  }

  50% {
    stroke-dasharray: 260 440;
    stroke-dashoffset: 120;
  }

  100% {
    stroke-dasharray: 260 440;
    stroke-dashoffset: 0;
  }
}

.animate-trend-line {
  animation: trend-line-dash 5.5s ease-in-out infinite;
}
</style>