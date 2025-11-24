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

        <div class="py-10 text-center space-y-8 max-w-4xl mx-auto px-4">
            <div class="space-y-4">
                <h1
                    class="text-5xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-linear-to-r from-lime-600 to-emerald-600">
                    {{ t('strategy.title') }}
                </h1>
                <p class="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    {{ t('common.description') }}
                </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg"
                    class="h-14 px-8 text-lg bg-lime-600 hover:bg-lime-700 text-white shadow-lg shadow-lime-200 rounded-full transition-all hover:scale-105"
                    @click="handleStart">
                    <i class="fa-brands fa-google mr-2"></i>
                    {{ t('auth.signInToAccount') }}
                </Button>
                
            </div>
        </div>

        <!-- Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 pb-2">
            <!-- Feature 1 -->
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="h-12 w-12 rounded-xl bg-lime-50 text-lime-600 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-chart-line text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-3">{{ t('strategy.backtest') }}</h3>
                <p class="text-slate-500 leading-relaxed">
                    {{ t('welcome.backtest.description') }}
                </p>
            </div>

            <!-- Feature 2 -->
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-sliders text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-3">{{ t('strategy.builder') }}</h3>
                <p class="text-slate-500 leading-relaxed">
                    {{ t('welcome.engine.description') }}
                </p>
            </div>

            <!-- Feature 3 -->
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-bolt text-xl"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-900 mb-3">{{ t('common.cloudComputing') }}</h3>
                <p class="text-slate-500 leading-relaxed">
                    {{ t('welcome.cloud.description') }}
                </p>
            </div>
        </div>
    </div>
</template>
