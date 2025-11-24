import axios, { type AxiosError } from 'axios'
import { toast } from 'vue-sonner'

const statusMessages: Record<number, string> = {
    400: '请求无效，请检查输入内容。',
    401: '请重新登录以继续操作。',
    403: '暂无权限执行此操作。',
    404: '未找到目标资源，请稍后再试。',
    408: '请求超时，请稍候重新发起。',
    409: '请求发生冲突，请刷新后重试。',
    429: '请求过于频繁，请稍后再试。',
    500: '服务器开小差了，稍后再试即可。',
    502: '网关或代理错误，请稍后重试。',
    503: '服务器暂时不可用，请稍侯。',
    504: '网关超时，请稍后重试。'
}

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
        return '请求超时，请检查网络或稍后再试。'
    }

    if (error.message.toLowerCase().includes('network')) {
        return '网络异常，请检查网络连接后重试。'
    }

    const serverMessage = extractServerMessage(error)
    if (serverMessage) {
        return serverMessage
    }

    const status = error.response?.status
    if (status) {
        return statusMessages[status] ?? `请求失败，HTTP ${status}`
    }

    return error.message || '请求失败，请稍后再试。'
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
