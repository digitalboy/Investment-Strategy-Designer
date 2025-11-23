<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
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

const { t } = useI18n({ useScope: 'global' })

defineProps<{
  open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

const store = useStrategyStore()
const name = ref('')
const description = ref('')
const isPublic = ref(false)
const isSaving = ref(false)

const handleSave = async () => {
  if (!name.value) return

  isSaving.value = true
  try {
    await store.saveStrategy(name.value, description.value, isPublic.value)
    emit('saved')
    emit('update:open', false)
    name.value = ''
    description.value = ''
    isPublic.value = false
  } catch (error) {
    console.error('Failed to save strategy:', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ t('saveStrategyDialog.title') }}</DialogTitle>
        <DialogDescription>
          {{ t('saveStrategyDialog.description') }}
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="name" class="text-right">
            {{ t('saveStrategyDialog.strategyName') }}
          </Label>
          <Input id="name" v-model="name" :placeholder="t('saveStrategyDialog.example')" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="description" class="text-right">
            {{ t('saveStrategyDialog.descriptionLabel') }}
          </Label>
          <Input id="description" v-model="description" :placeholder="t('saveStrategyDialog.descriptionPlaceholder')"
            class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <div class="col-start-2 col-span-3 flex items-center space-x-2">
            <input type="checkbox" id="isPublic" v-model="isPublic"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
            <Label for="isPublic" class="font-normal cursor-pointer">
              {{ t('saveStrategyDialog.shareToCommunity') }}
            </Label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">{{ t('saveStrategyDialog.cancel') }}</Button>
        <Button type="submit" @click="handleSave" :disabled="!name || isSaving">
          {{ isSaving ? t('saveStrategyDialog.saving') : t('saveStrategyDialog.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
