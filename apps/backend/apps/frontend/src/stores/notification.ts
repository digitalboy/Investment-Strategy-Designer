import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { notificationService, type NotificationItem } from '@/services/notificationService'

export type { NotificationItem }

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref<NotificationItem[]>([])
    const unreadCount = ref(0)
    const loading = ref(false)
    const hasMore = ref(true)
    const page = ref(1)
    const limit = 20

    const fetchNotifications = async (reset = false) => {
        if (reset) {
            page.value = 1
            notifications.value = []
            hasMore.value = true
        }

        if (!hasMore.value && !reset) return

        loading.value = true
        const authStore = useAuthStore()
        const token = await authStore.getFreshToken()

        if (!token) {
            loading.value = false
            return
        }

        try {
            const data = await notificationService.getNotifications(token, page.value, limit)
            
            if (reset) {
                notifications.value = data.items
            } else {
                notifications.value.push(...data.items)
            }
            
            unreadCount.value = data.unreadCount
            hasMore.value = data.hasMore
            page.value++
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            loading.value = false
        }
    }

    const markAsRead = async (id: string) => {
        const notification = notifications.value.find(n => n.id === id)
        if (notification && notification.read) return

        // Optimistic update
        if (notification) {
            notification.read = true
            unreadCount.value = Math.max(0, unreadCount.value - 1)
        }

        const authStore = useAuthStore()
        const token = await authStore.getFreshToken()
        if (!token) return

        try {
            await notificationService.markAsRead(token, id)
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
            // Revert optimistic update if needed
        }
    }

    const markAllRead = async () => {
        if (unreadCount.value === 0) return

        // Optimistic update
        notifications.value.forEach(n => n.read = true)
        unreadCount.value = 0

        const authStore = useAuthStore()
        const token = await authStore.getFreshToken()
        if (!token) return

        try {
            await notificationService.markAllRead(token)
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    return {
        notifications,
        unreadCount,
        loading,
        hasMore,
        fetchNotifications,
        markAsRead,
        markAllRead
    }
})
