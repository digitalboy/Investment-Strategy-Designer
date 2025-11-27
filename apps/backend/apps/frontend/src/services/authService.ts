import axios from '@/lib/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://investment-strategy-designer-backend.digitalboyzone.workers.dev/api/v1'

export const authService = {
    async syncUser(token: string): Promise<void> {
        await axios.post(`${API_BASE_URL}/users/sync`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
    }
}
