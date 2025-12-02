<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import LanguageSelector from '@/components/LanguageSelector.vue'
import NotificationsDialog from '@/components/NotificationsDialog.vue'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Info } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'

const { t } = useI18n({ useScope: 'global' })


const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const { notifications, unreadCount } = storeToRefs(notificationStore)

// Notification State
const showNotifications = ref(false)
const showContactDialog = ref(false)

// Poll for notifications periodically
onMounted(() => {
    if (authStore.isAuthenticated) {
        notificationStore.fetchNotifications(true)
    }
    // Simple polling every 5 minutes
    setInterval(() => {
        if (authStore.isAuthenticated) {
            notificationStore.fetchNotifications(true)
        }
    }, 5 * 60 * 1000)
})

watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    if (isAuthenticated) {
        notificationStore.fetchNotifications(true)
    } else {
        notificationStore.reset() // Reset store if available or manually clear
        notifications.value = []
        unreadCount.value = 0
    }
})

const handleNotificationClick = () => {
    showNotifications.value = true
    // Optionally re-fetch on open to be sure
    notificationStore.fetchNotifications(true)
}

const handleMarkAllRead = () => {
    notificationStore.markAllRead()
}

const handleItemClick = (id: string) => {
    notificationStore.markAsRead(id)
    // If metadata has strategyId, we could navigate
    // const item = notifications.value.find(n => n.id === id)
    /* 
    // Navigation logic example:
    if (item?.metadata?.strategyId) {
        showNotifications.value = false
        // navigate logic here if needed, e.g. emit event or use router
    } 
    */
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
                    <RouterLink to="/" class="flex items-center gap-3 cursor-pointer">
                        <div
                            class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                            Q
                        </div>
                        <span class="font-bold text-xl tracking-tight text-slate-800">VESTLab QuantStrategy</span>
                    </RouterLink>
                </div>
                <div class="flex items-center gap-4">
                    <!-- Notifications Bell -->
                    <div v-if="authStore.user"
                        class="relative cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors"
                        @click="handleNotificationClick">
                        <Bell class="h-5 w-5 text-slate-600" />
                        <span
                            class="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white transition-all"
                            :class="unreadCount > 0 ? 'bg-red-500' : 'bg-slate-400'">
                            {{ unreadCount > 9 ? '9+' : unreadCount }}
                        </span>
                    </div>

                    <div class="flex items-center gap-2">
                        <Globe class="h-4 w-4 text-slate-500" />
                        <LanguageSelector />
                    </div>

                    <button type="button" class="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                        @click="showContactDialog = true" aria-label="Contact author">
                        <Info class="h-5 w-5" />
                    </button>

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
        <NotificationsDialog v-model:open="showNotifications" :notifications="notifications"
            @mark-all-read="handleMarkAllRead" @click-item="handleItemClick" />

        <Dialog v-model:open="showContactDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader class="text-center sm:text-center">
                    <div
                        class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                        <span class="text-2xl font-bold text-white">D</span>
                    </div>
                    <DialogTitle class="text-xl">David Zhang</DialogTitle>
                    <DialogDescription class="text-sm text-slate-500">
                        {{ t('navbar.contactAuthorDescription') }}
                    </DialogDescription>
                </DialogHeader>

                <div class="mt-4 space-y-3">
                    <a href="mailto:digitalboyzone@gmail.com"
                        class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50/50">
                        <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-medium text-slate-500">{{ t('navbar.contactEmailLabel').replace(':',
                                '') }}</p>
                            <p class="truncate text-sm font-medium text-slate-800">digitalboyzone@gmail.com</p>
                        </div>
                    </a>

                    <a href="https://x.com/freethisslave" target="_blank" rel="noreferrer"
                        class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50/50">
                        <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24"
                                fill="currentColor">
                                <path
                                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-medium text-slate-500">{{
                                t('navbar.contactXAccountLabel').replace(':', '') }}</p>
                            <p class="truncate text-sm font-medium text-slate-800">@freethisslave</p>
                        </div>
                    </a>

                    <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24"
                                fill="currentColor">
                                <path
                                    d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.007-.264-.03-.406-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
                            </svg>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-medium text-slate-500">{{ t('navbar.contactWechatLabel').replace(':',
                                '') }}</p>
                            <p class="truncate text-sm font-medium text-slate-800">digitalboy</p>
                        </div>
                    </div>
                </div>

                <DialogFooter class="mt-6 sm:justify-center">
                    <Button variant="outline" size="sm" @click="showContactDialog = false" class="w-full sm:w-auto">
                        {{ t('navbar.close') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </nav>
</template>
