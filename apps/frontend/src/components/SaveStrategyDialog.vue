<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, watch, computed } from 'vue'
import { useStrategyStore } from '@/stores/strategy'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getStrategyNameLength } from '@/lib/utils'

import { toast } from 'vue-sonner'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

const store = useStrategyStore()
const name = ref('')
const description = ref('')
const isPublic = ref(true) // Default to public
const isSaving = ref(false)

const nameError = computed(() => {
  if (name.value && getStrategyNameLength(name.value) > 20) {
    return t('setupWizard.validation.strategyNameTooLong')
  }
  return ''
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Pre-fill from store
    name.value = store.currentStrategyName || ''
    description.value = store.currentStrategyDescription || ''
    // Keep isPublic default true unless we have logic to recall previous state (not needed for new strategy)
    isPublic.value = true
  }
})

const handleSave = async () => {
  if (!name.value || nameError.value) return

  isSaving.value = true
  try {
    await store.saveStrategy(name.value, description.value, isPublic.value)
    toast.success(t('strategy.messages.strategySaved'))
    emit('saved')
    emit('update:open', false)
    // name/description reset is handled by watch on next open or could be cleared here
    // but clearing here might look glitchy if animation is slow.
    // Let's rely on watch to reset/overwrite on next open.
  } catch (error: any) {
    console.error('Failed to save strategy:', error)
    toast.error(error.message || t('strategy.messages.saveFailed'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent
      class="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-linear-to-br from-white via-blue-50/30 to-indigo-50/20">
      <!-- Top Decoration Bar -->
      <div class="h-1.5 bg-linear-to-r from-indigo-500 via-blue-500 to-violet-500"></div>

      <!-- Header Section -->
      <DialogHeader class="px-8 pt-8 pb-6 space-y-3">
        <div class="flex items-center gap-4">
          <div
            class="flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
            </svg>
          </div>
          <div class="flex-1">
            <DialogTitle
              class="text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              {{ t('saveStrategyDialog.title') }}
            </DialogTitle>
            <DialogDescription class="text-slate-600 mt-1.5">
              {{ t('saveStrategyDialog.description') }}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <!-- Form Section -->
      <div class="px-8 py-6 space-y-7">
        <!-- Strategy Name -->
        <div class="space-y-4">
          <Label for="name" class="text-sm font-semibold text-slate-700 flex items-center gap-2 ml-1">
            <div class="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                </path>
              </svg>
            </div>
            {{ t('saveStrategyDialog.strategyName') }}
          </Label>
          <Input id="name" v-model="name" :placeholder="t('saveStrategyDialog.example')"
            class="h-11 border-slate-200 hover:border-emerald-300 focus:border-emerald-500 transition-colors bg-white shadow-sm" 
            :class="{ 'border-red-300 focus:border-red-500': nameError }" />
          <p v-if="nameError" class="text-xs text-red-500 font-medium ml-1">{{ nameError }}</p>
        </div>

        <!-- Description -->
        <div class="space-y-4">
          <Label for="description" class="text-sm font-semibold text-slate-700 flex items-center gap-2 ml-1">
            <div class="p-1 rounded-md bg-blue-50 text-blue-600">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                </path>
              </svg>
            </div>
            {{ t('saveStrategyDialog.descriptionLabel') }}
          </Label>
          <textarea id="description" v-model="description" :placeholder="t('saveStrategyDialog.descriptionPlaceholder')"
            class="flex h-24 w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus:border-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 shadow-sm" />
        </div>

        <!-- Public Toggle -->
        <div class="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div class="space-y-0.5">
            <Label class="text-base font-medium text-slate-800 flex items-center gap-2">
              <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                </path>
              </svg>
              {{ t('saveStrategyDialog.shareToCommunity') }}
            </Label>
            <p class="text-xs text-slate-500 pl-6">
              Allows other users to view and copy your strategy
            </p>
          </div>
          <Switch :checked="isPublic" @update:checked="isPublic = $event"
            class="
              data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-slate-200
              shadow-sm hover:shadow-md transition-shadow
              focus-visible:ring-offset-background
            "
          />
        </div>
      </div>

      <!-- Footer -->
      <DialogFooter class="px-8 py-6 bg-slate-50/80 border-t border-slate-200/60 gap-3">
        <Button variant="outline" @click="$emit('update:open', false)"
          class="h-11 px-6 border-slate-300 hover:bg-white hover:border-slate-400 transition-all">
          {{ t('saveStrategyDialog.cancel') }}
        </Button>
        <Button type="submit" @click="handleSave" :disabled="!name || !!nameError || isSaving"
          class="h-11 px-8 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
          <svg v-if="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          {{ isSaving ? t('saveStrategyDialog.saving') : t('saveStrategyDialog.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
