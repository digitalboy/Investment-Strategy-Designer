import axios, { type AxiosError } from 'axios'
import { toast } from 'vue-sonner'
import { t } from './i18n'

const getStatusMessage = (status: number) => t(`api.status.${status}`)

const extractServerMessage = (error: AxiosError) => {
    if (!error.response) return undefined
    const data = error.response.data as unknown
    if (typeof data === 'object' && data !== null && 'message' in data) {
        const value = (data as Record<string, unknown>).message
        if (typeof value === 'string' && value.trim().length) {
            return value
        }
    }
    if (typeof data === 'string') {
        return data
    }
    return undefined
}

const buildToastMessage = (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
        return t('api.timeout')
    }

    if (error.message.toLowerCase().includes('network')) {
        return t('api.networkError')
    }

    const serverMessage = extractServerMessage(error)
    if (serverMessage) {
        return serverMessage
    }

    const status = error.response?.status
    if (status) {
        return getStatusMessage(status) || t('api.httpStatus', { status })
    }

    return t('api.requestFailed')
}

const notifyHttpError = (error: AxiosError) => {
    const message = buildToastMessage(error)
    toast.error(message)
}

axios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        notifyHttpError(error)
        return Promise.reject(error)
    }
)

export default axios
