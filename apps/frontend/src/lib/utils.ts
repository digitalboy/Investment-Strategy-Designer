import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone } from "date-fns-tz"
import { zhCN } from "date-fns/locale"
import { isToday, isYesterday, differenceInDays } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  if (isToday(date)) {
    return `今天 ${formatInTimeZone(date, userTimeZone, 'HH:mm', { locale: zhCN })}`
  }
  if (isYesterday(date)) {
    return `昨天 ${formatInTimeZone(date, userTimeZone, 'HH:mm', { locale: zhCN })}`
  }

  const daysDiff = differenceInDays(new Date(), date)
  if (daysDiff < 7) {
    return `${daysDiff}天前`
  }

  // 获取用户本地时区并格式化为中文
  return formatInTimeZone(date, userTimeZone, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
}

export const validateStrategyName = (name: string): { isValid: boolean; message?: string } => {
  let len = 0;
  for (let i = 0; i < name.length; i++) {
    // If char code is greater than 127, it's likely a double-byte character (like Chinese)
    // We count it as 2 units.
    if (name.charCodeAt(i) > 127) {
      len += 2;
    } else {
      len += 1;
    }
  }

  if (len > 20) {
    return {
      isValid: false,
      message: 'Name too long (max 10 Chinese chars or 20 English letters)'
    };
  }
  return { isValid: true };
}

export const getStrategyNameLength = (name: string): number => {
  let len = 0;
  for (let i = 0; i < name.length; i++) {
    if (name.charCodeAt(i) > 127) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}
