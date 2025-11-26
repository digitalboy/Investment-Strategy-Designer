import axios from '@/lib/api'

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

export interface NotificationsResponse {
    items: NotificationItem[]
    unreadCount: number
    hasMore: boolean
}

export const notificationService = {
    async getNotifications(token: string, page: number, limit: number = 20): Promise<NotificationsResponse> {
        const response = await axios.get(`${API_BASE_URL}/notifications`, {
            params: { page, limit },
            headers: { 'Authorization': `Bearer ${token}` }
        })
        return response.data
    },

    async markAsRead(token: string, id: string): Promise<void> {
        await axios.put(
            `${API_BASE_URL}/notifications/${id}/read`,
            {},
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
    },

    async markAllRead(token: string): Promise<void> {
        await axios.put(
            `${API_BASE_URL}/notifications/read-all`,
            {},
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
    }
}
