<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Pencil, Calendar, Wallet, Layers, Settings } from 'lucide-vue-next'
import type { StrategyConfig } from '@/types'
import { getStrategyNameLength } from '@/lib/utils'

const props = defineProps<{
    title: string
    metadata: { id: string; isOwner: boolean; isPublic: boolean; name?: string } | null
    config: StrategyConfig
    triggerCount: number
    isLoading: boolean
    canAdjustSetup: boolean
}>()

const emit = defineEmits<{
    'back': []
    'edit-setup': []
    'update-name': [name: string]
    'update-visibility': [isPublic: boolean]
}>()

const { t } = useI18n()

const editableName = ref('')
const isEditingName = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

// Initialize editable name
watch(() => props.title, (newVal) => {
    if (!isEditingName.value) {
        editableName.value = newVal
    }
}, { immediate: true })

const isPublicChecked = computed({
    get: () => props.metadata?.isPublic ?? false,
    set: (checked: boolean) => {
        emit('update-visibility', checked)
    }
})

const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return '--'
    const amount = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(amount)) return '--'
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const investingHorizon = computed(() => {
    if (!props.config.startDate || !props.config.endDate) return t('strategy.header.timeRangeNotSet')
    return `${props.config.startDate} → ${props.config.endDate}`
})

const startEditingName = () => {
    editableName.value = props.title // Ensure fresh value
    isEditingName.value = true
    nextTick(() => nameInputRef.value?.focus())
}

const finishEditingName = () => {
    const trimmed = editableName.value.trim()

    if (trimmed && getStrategyNameLength(trimmed) > 20) {
        alert(t('setupWizard.validation.strategyNameTooLong'))
        // Keep editing state true so user can fix it, but we need to focus back or something.
        // However, the blur event triggers this. If we alert on blur, it might be annoying loop.
        // A better UX for inline edit on blur is to revert if invalid, or just accept if valid.
        // Let's revert if invalid to avoid getting stuck.
        editableName.value = props.title
        isEditingName.value = false
        return
    }

    if (trimmed && trimmed !== props.title) {
        emit('update-name', trimmed)
    } else {
        editableName.value = props.title // Revert if empty or unchanged
    }
    isEditingName.value = false
}
</script>

<template>
    <section
        class="rounded-3xl border border-emerald-300/40 bg-linear-to-r from-lime-600 via-emerald-600 to-lime-600 px-6 py-5 shadow-2xl shadow-lime-500/20 sticky top-4 z-20">
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <!-- Left: Title & Meta -->
                <div class="space-y-3">
                    <div class="flex items-center gap-2 text-emerald-100">
                        <Button variant="ghost" size="icon"
                            class="h-8 w-8 -ml-2 text-emerald-100 hover:text-white hover:bg-white/20 rounded-full transition-all"
                            @click="emit('back')">
                            <ArrowLeft class="h-4 w-4" />
                        </Button>
                        <span class="text-xs font-medium uppercase tracking-wider text-emerald-100">{{
                            t('strategy.header.workspaceTitle') }}</span>
                    </div>

                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="flex items-center gap-2">
                            <div v-if="!isEditingName" class="flex items-center gap-2">
                                <h1 class="text-2xl font-bold text-white tracking-tight">{{ title }}</h1>
                                <Button v-if="metadata?.isOwner" variant="ghost" size="icon"
                                    class="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                    :disabled="isLoading" @click="startEditingName">
                                    <Pencil class="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Input v-else ref="nameInputRef" v-model="editableName" :disabled="isLoading"
                                :placeholder="t('strategy.header.enterStrategyName')"
                                class="text-2xl font-bold h-10 bg-white/20 border-white/30 text-white placeholder:text-white/50"
                                @blur="finishEditingName" @keydown.enter="finishEditingName"
                                @keydown.esc="isEditingName = false" />
                        </div>
                        <Badge variant="outline"
                            class="font-mono text-white bg-white/20 border-white/30 px-3 py-0.5 rounded-lg shadow-sm backdrop-blur-sm">
                            {{ config.etfSymbol || t('strategy.header.noSymbolSelected') }}
                        </Badge>
                    </div>

                    <div class="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                        <div class="flex items-center gap-2 group cursor-help"
                            :title="t('strategy.header.backtestingTimeRange')">
                            <Calendar class="h-4 w-4 text-emerald-100 group-hover:text-white transition-colors" />
                            <span class="font-medium text-white/90 group-hover:text-white transition-colors">{{
                                investingHorizon }}</span>
                        </div>
                        <div class="flex items-center gap-2 group cursor-help"
                            :title="t('strategy.header.initialCapital')">
                            <Wallet class="h-4 w-4 text-emerald-100 group-hover:text-white transition-colors" />
                            <span class="font-medium text-white/90 group-hover:text-white transition-colors">{{
                                formatCurrency(config.initialCapital) }}</span>
                        </div>
                        <div class="flex items-center gap-2 group cursor-help"
                            :title="t('strategy.header.triggerCount')">
                            <Layers class="h-4 w-4 text-emerald-100 group-hover:text-white transition-colors" />
                            <span class="font-medium text-white/90 group-hover:text-white transition-colors">{{
                                triggerCount }} {{ t('strategy.header.triggers') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Right: Status & Actions -->
                <div class="flex items-center gap-4 pt-2">
                    <!-- Visibility Toggle -->
                    <div v-if="metadata?.isOwner"
                        class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                        <div class="flex items-center gap-2">
                            <svg v-if="isPublicChecked" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <svg v-else class="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span class="text-xs font-medium text-white/90">{{ isPublicChecked ?
                                t('strategy.header.public') : t('strategy.header.private')
                            }}</span>
                        </div>
                        <Switch v-model="isPublicChecked" :disabled="isLoading"
                            class="data-[state=checked]:bg-white/60 data-[state=unchecked]:bg-white/20 border-0" />
                    </div>

                    <div class="h-8 w-px bg-white/20 mx-2 hidden md:block" v-if="canAdjustSetup"></div>

                    <Button v-if="canAdjustSetup" variant="outline"
                        class="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition-all backdrop-blur-sm"
                        @click="emit('edit-setup')">
                        <Settings class="h-4 w-4 mr-2" />
                        {{ t('strategy.header.settings') }}
                    </Button>
                </div>
            </div>
        </div>
    </section>
</template>
