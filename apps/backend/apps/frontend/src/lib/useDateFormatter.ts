import { useI18n } from 'vue-i18n'
import { formatInTimeZone } from "date-fns-tz"
import { zhCN, enUS } from "date-fns/locale"
import { isToday, isYesterday, differenceInDays } from "date-fns"

export function useDateFormatter() {
    const { t, locale } = useI18n()

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString)
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // 根据当前语言选择 locale
        const dateLocale = locale.value === 'zh' ? zhCN : enUS

        if (isToday(date)) {
            return `${t('common.today')} ${formatInTimeZone(date, userTimeZone, 'HH:mm', { locale: dateLocale })}`
        }
        if (isYesterday(date)) {
            return `${t('common.yesterday')} ${formatInTimeZone(date, userTimeZone, 'HH:mm', { locale: dateLocale })}`
        }

        const daysDiff = differenceInDays(new Date(), date)
        if (daysDiff < 7) {
            return t('common.daysAgo', { count: daysDiff })
        }

        // 使用翻译的日期格式
        const formatString = locale.value === 'zh'
            ? 'yyyy年MM月dd日 HH:mm'
            : "MMM dd, yyyy 'at' HH:mm"

        return formatInTimeZone(date, userTimeZone, formatString, { locale: dateLocale })
    }

    return {
        formatDate
    }
}