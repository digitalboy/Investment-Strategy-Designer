<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStrategyStore } from '@/stores/strategy'
import WelcomeState from '@/components/WelcomeState.vue'
import CommunityBoard from '@/components/CommunityBoard.vue'
import SetupWizardDialog from '@/components/SetupWizardDialog.vue'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const authStore = useAuthStore()
const strategyStore = useStrategyStore()
const showSetupWizard = ref(false)

const startCreate = () => {
  strategyStore.reset()
  showSetupWizard.value = true
}

const onSetupCompleted = () => {
  // Instead of setting showEditor, we navigate to the new strategy's edit page
  // Assuming the store or logic sets the current strategy ID after setup?
  // If it's a new strategy it might not have an ID yet or it's in local state.
  // If it's purely local state before saving, we might need a specific route like /strategy/new
  // OR, if StrategyDashboard handles "new" strategy state from store.
  
  // Check how StrategyDashboard works. It reads from store. 
  // So we can route to a special ID 'new' or just let the store handle it?
  // Existing logic was: showEditor = true. StrategyDashboard reads store.
  // So we can route to /builder or /strategy/new
  
  // For now, let's assuming navigating to /strategy/draft or similar is best?
  // Or we can route to the dashboard without an ID? 
  // My router config expects /strategy/:id
  
  // Let's add a route for creating: /create
  router.push({ name: 'strategy-create' })
}

const handleViewStrategy = (strategyId: string) => {
  router.push({ name: 'strategy-detail', params: { id: strategyId } })
}
</script>

<template>
  <div class="animate-fade-in">
    <!-- 未登录：欢迎页 + 社区 -->
    <div v-if="!authStore.isAuthenticated" class="space-y-16">
      <WelcomeState @start-create="startCreate" />
      <CommunityBoard @create-strategy="startCreate" @view-strategy="handleViewStrategy" />
    </div>

    <!-- 已登录：社区面板（我的策略 + 公开策略） -->
    <div v-else class="space-y-8">
      <!-- 欢迎横幅 -->
      <div
        class="relative overflow-hidden rounded-3xl bg-linear-to-r from-lime-600 via-emerald-600 to-lime-600 px-8 py-12 shadow-2xl shadow-lime-500/20">
        <div
          class="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.05)_50%,transparent_75%,transparent_100%)] bg-size-[250%_250%] animate-shimmer">
        </div>
        <div class="relative">
          <h2 class="text-3xl font-bold text-white mb-3 tracking-tight">
            {{ t('common.welcomeBack') }}, {{ t('dashboard.strategyMaster') }} 👋
          </h2>
          <p class="text-emerald-100 text-lg max-w-2xl">
            {{ t('dashboard.continueOptimizing') }}
          </p>
        </div>
      </div>

      <CommunityBoard @create-strategy="startCreate" @view-strategy="handleViewStrategy" />
    </div>

    <!-- 设置向导对话框 -->
    <SetupWizardDialog v-model:open="showSetupWizard" @completed="onSetupCompleted" />
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -250% 0;
  }

  100% {
    background-position: 250% 0;
  }
}

.animate-shimmer {
  animation: shimmer 8s ease-in-out infinite;
}
</style>
