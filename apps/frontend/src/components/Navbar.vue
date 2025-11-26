<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import LanguageSelector from '@/components/LanguageSelector.vue'
import NotificationsDialog, { type NotificationItem } from '@/components/NotificationsDialog.vue'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Globe, Bell } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const emit = defineEmits(['navigate-home'])

const authStore = useAuthStore()

// Notification State
const showNotifications = ref(false)
const notifications = ref<NotificationItem[]>([
    {
        id: '1',
        title: '策略回测完成',
        content: '您的策略 "QQQ 趋势增强" 已完成回测，年化回报率 15.2%。',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        read: false
    },
    {
        id: '2',
        title: '新功能上线',
        content: '我们上线了实盘信号监控功能，快去策略详情页开启吧！',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        read: false
    }
])

const notificationCount = computed(() => notifications.value.filter(n => !n.read).length)

const handleNotificationClick = () => {
    showNotifications.value = true
}

const handleMarkAllRead = () => {
    notifications.value.forEach(n => n.read = true)
}

const handleItemClick = (id: string) => {
    const item = notifications.value.find(n => n.id === id)
    if (item) item.read = true
}

const handleLogin = async () => {
    try {
        await authStore.signInWithGoogle()
    } catch (error) {
        // Error handling is done in the store or can be added here
    }
}

const handleLogout = () => {
    authStore.signOut()
}
</script>

<template>
    <nav class="border-b bg-white/75 backdrop-blur-md sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex items-center gap-8">
                    <div class="flex items-center gap-3 cursor-pointer" @click="$emit('navigate-home')">
                        <div
                            class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                            Q
                        </div>
                        <span class="font-bold text-xl tracking-tight text-slate-800">VESTLab QuantStrategy</span>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <!-- Notifications Bell -->
                    <div v-if="authStore.user" class="relative cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors"
                        @click="handleNotificationClick">
                        <Bell class="h-5 w-5 text-slate-600" />
                        <span 
                            class="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white transition-all"
                            :class="notificationCount > 0 ? 'bg-red-500' : 'bg-slate-400'">
                            {{ notificationCount > 9 ? '9+' : notificationCount }}
                        </span>
                    </div>

                    <div class="flex items-center gap-2">
                        <Globe class="h-4 w-4 text-slate-500" />
                        <LanguageSelector />
                    </div>

                    <div v-if="authStore.isLoading" class="h-8 w-8 rounded-full bg-slate-200 animate-pulse"></div>

                    <div v-else-if="authStore.user">
                        <DropdownMenu>
                            <DropdownMenuTrigger class="focus:outline-none">
                                <Avatar class="border-2 border-emerald-200 shadow-sm">
                                    <AvatarImage :src="authStore.user.photoURL || ''"
                                        :alt="authStore.user.displayName || 'User'" />
                                    <AvatarFallback>{{ authStore.user.displayName ?
                                        authStore.user.displayName.charAt(0).toUpperCase() : 'U' }}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    <div class="flex flex-col space-y-1">
                                        <p class="text-sm font-medium leading-none">{{ authStore.user.displayName }}</p>
                                        <p class="text-xs leading-none text-muted-foreground">{{ authStore.user.email }}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem @click="handleLogout" class="text-red-600 cursor-pointer">
                                    <i class="fa-solid fa-right-from-bracket mr-2"></i>
                                    {{ t('auth.logout') }}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Button v-else @click="handleLogin" variant="default" size="sm"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <i class="fa-brands fa-google mr-2"></i>
                        {{ t('auth.login') }}
                    </Button>
                </div>
            </div>
        </div>

        <!-- Notifications Dialog -->
        <NotificationsDialog 
            v-model:open="showNotifications" 
            :notifications="notifications"
            @mark-all-read="handleMarkAllRead"
            @click-item="handleItemClick"
        />
    </nav>
</template>
