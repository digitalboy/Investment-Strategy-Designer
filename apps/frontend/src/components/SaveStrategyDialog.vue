<script setup lang="ts">
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

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

const store = useStrategyStore()
const name = ref('')
const description = ref('')
const isSaving = ref(false)

const handleSave = async () => {
  if (!name.value) return
  
  isSaving.value = true
  try {
    await store.saveStrategy(name.value, description.value)
    emit('saved')
    emit('update:open', false)
    name.value = ''
    description.value = ''
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
        <DialogTitle>保存策略</DialogTitle>
        <DialogDescription>
          给您的策略起个名字，以便日后查看和加载。
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="name" class="text-right">
            策略名称
          </Label>
          <Input id="name" v-model="name" placeholder="例如：QQQ 抄底策略" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="description" class="text-right">
            描述 (可选)
          </Label>
          <Input id="description" v-model="description" placeholder="简要描述策略逻辑" class="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">取消</Button>
        <Button type="submit" @click="handleSave" :disabled="!name || isSaving">
          {{ isSaving ? '保存中...' : '保存' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
