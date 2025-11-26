import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from '@/lib/api'
import { useAuthStore } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://investment-strategy-designer-backend.digitalboyzone.workers.dev/api/v1'

export interface NotificationItem {
    id: string
    title: string
    content: string
    type: 'signal' | 'system'
    read: boolean
    timestamp: string
    metadata?: Record<string, any>
}

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
            const response = await axios.get(`${API_BASE_URL}/notifications`, {
                params: { page: page.value, limit },
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const { items, unreadCount: count, hasMore: more } = response.data
            
            if (reset) {
                notifications.value = items
            } else {
                notifications.value.push(...items)
            }
            
            unreadCount.value = count
            hasMore.value = more
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
            await axios.put(
                `${API_BASE_URL}/notifications/${id}/read`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
            // Revert optimistic update if needed, but usually fine to ignore for read status
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
            await axios.put(
                `${API_BASE_URL}/notifications/read-all`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
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
