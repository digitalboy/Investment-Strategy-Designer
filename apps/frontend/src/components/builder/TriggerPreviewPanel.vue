<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
    conditionSummary: string
    actionSummary: string
    cooldownSummary: string
}>()
</script>

<template>
    <aside
        class="h-fit w-full rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-white p-5 lg:sticky lg:top-4 lg:w-72">
        <p class="text-xs font-semibold tracking-wide text-emerald-600">{{ t('triggerBuilderDialog.preview.title') }}
        </p>
        <p class="mt-2 text-sm leading-6 text-emerald-900">
            {{ t('triggerBuilderDialog.preview.template', {
                condition: conditionSummary,
                action: actionSummary,
                cooldown: cooldownSummary
            }) }}
        </p>
    </aside>
</template>
