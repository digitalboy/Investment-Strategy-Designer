<script setup lang="ts">
defineProps<{
    conditionSummary: string
    actionSummary: string
    cooldownSummary: string
}>()
</script>

<template>
    <aside
        class="h-fit w-full rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-5 lg:sticky lg:top-4 lg:w-72">
        <p class="text-xs font-semibold tracking-wide text-indigo-600">💡 策略预览</p>
        <p class="mt-2 text-sm leading-6 text-indigo-900">
            {{ conditionSummary }}，系统将 {{ actionSummary }}。{{ cooldownSummary }}。
        </p>
    </aside>
</template>
