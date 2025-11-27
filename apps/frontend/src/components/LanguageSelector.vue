<template>
  <div class="flex items-center">
    <select @change="changeLanguage" :value="currentLanguage"
      class="bg-transparent border border-slate-200 rounded-md py-1 pl-2 pr-6 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
      <option value="zh">中文</option>
      <option value="en">English</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLanguageStore } from '@/stores/language'

const languageStore = useLanguageStore()

// 获取当前语言
const currentLanguage = computed(() => languageStore.currentLanguage)

// 切换语言
const changeLanguage = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newLang = target.value as 'zh' | 'en'
  languageStore.setLanguage(newLang)
}
</script>