<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/Navbar.vue'
import WelcomeState from '@/components/WelcomeState.vue'
import StrategyDashboard from '@/components/StrategyDashboard.vue'
import SetupWizardDialog from '@/components/SetupWizardDialog.vue'

const authStore = useAuthStore()
const hasStarted = ref(false)
const showSetupWizard = ref(false)

onMounted(() => {
  authStore.init()
})

const startCreate = () => {

  showSetupWizard.value = true
}

const onSetupCompleted = () => {
  hasStarted.value = true
}

const editSetup = () => {
  showSetupWizard.value = true
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <Navbar />
    <main class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <WelcomeState v-if="!hasStarted" @start-create="startCreate" />
      <StrategyDashboard v-else @edit-setup="editSetup" />
    </main>
    <SetupWizardDialog v-model:open="showSetupWizard" @completed="onSetupCompleted" />
  </div>
</template>
