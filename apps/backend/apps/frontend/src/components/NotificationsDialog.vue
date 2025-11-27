<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Bell, Check } from 'lucide-vue-next'
import { useDateFormatter } from '@/lib/useDateFormatter'
import type { NotificationItem } from '@/services/notificationService'

// Directly define and destructure the props
const { open, notifications } = defineProps<{
    open: boolean
    notifications: NotificationItem[]
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    'mark-all-read': []
    'click-item': [id: string]
}>()

const { t } = useI18n({ useScope: 'global' })
const { formatDate } = useDateFormatter()







// Explicitly use props to avoid TS6133 warning, although it's used in template.



// eslint-disable-next-line @typescript-eslint/no-unused-vars



// const _ = props.notifications;

</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[420px] p-0 gap-0 overflow-hidden bg-white">
            <DialogHeader class="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                <DialogTitle class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Bell class="h-5 w-5 text-emerald-600" />
                    {{ t('common.notification') }}
                </DialogTitle>
                <Button v-if="notifications.length > 0" variant="ghost" size="sm" class="h-8 px-2 text-xs text-slate-500 hover:text-emerald-600"
                    @click="$emit('mark-all-read')">
                    <Check class="h-3 w-3 mr-1" />
                    {{ t('common.markAllRead') }}
                </Button>
            </DialogHeader>

            <div class="max-h-[60vh] overflow-y-auto p-2">
                <div v-if="notifications.length === 0" class="py-12 text-center flex flex-col items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                        <Bell class="h-6 w-6 text-slate-300" />
                    </div>
                    <p class="text-sm text-slate-500">{{ t('common.noNotifications') }}</p>
                </div>

                <div v-else class="space-y-1">
                    <div v-for="item in notifications" :key="item.id"
                        class="relative p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                        :class="{ 'bg-slate-50/50': item.read }"
                        @click="$emit('click-item', item.id)">
                        
                        <!-- Unread Indicator -->
                        <div v-if="!item.read" class="absolute left-3 top-4 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></div>

                        <div class="flex flex-col gap-1" :class="{ 'pl-4': !item.read }">
                            <div class="flex justify-between items-start">
                                <h4 class="text-sm font-semibold text-slate-800 leading-tight" :class="{ 'text-slate-600 font-medium': item.read }">
                                    {{ item.title }}
                                </h4>
                                <span class="text-[10px] text-slate-400 shrink-0 ml-2">{{ formatDate(item.timestamp) }}</span>
                            </div>
                            <!-- Pre-wrap ensures newlines from the backend are respected -->
                            <p class="text-xs text-slate-600 leading-relaxed line-clamp-2 whitespace-pre-wrap">
                                {{ item.content }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
