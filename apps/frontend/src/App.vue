<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/Navbar.vue'
import WelcomeState from '@/components/WelcomeState.vue'
import StrategyDashboard from '@/components/StrategyDashboard.vue'
import CommunityBoard from '@/components/CommunityBoard.vue'
import SetupWizardDialog from '@/components/SetupWizardDialog.vue'

const authStore = useAuthStore()
const showSetupWizard = ref(false)
const showEditor = ref(false)

onMounted(() => {
  authStore.init()
})

const startCreate = () => {
  showSetupWizard.value = true
}

const onSetupCompleted = () => {
  showEditor.value = true
}

const editSetup = () => {
  showSetupWizard.value = true
}

const exitEditor = () => {
  showEditor.value = false
}

const handleNavigateHome = () => {
  showEditor.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <Navbar @navigate-home="handleNavigateHome" />
    <main class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <!-- Editor View -->
      <template v-if="showEditor">
        <StrategyDashboard @edit-setup="editSetup" @back="exitEditor" />
      </template>

      <!-- Main View -->
      <template v-else>
        <!-- Not Logged In: Welcome + Community -->
        <div v-if="!authStore.isAuthenticated" class="space-y-12">
          <WelcomeState @start-create="startCreate" />
          <CommunityBoard @create-strategy="startCreate" />
        </div>

        <!-- Logged In: Community (My Strategies + Public) -->
        <div v-else>
          <CommunityBoard @create-strategy="startCreate" />
        </div>
      </template>
    </main>
    <SetupWizardDialog v-model:open="showSetupWizard" @completed="onSetupCompleted" />
  </div>
</template>
