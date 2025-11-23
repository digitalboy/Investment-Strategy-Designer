import type { TriggerCondition } from '@/types'

export const triggerGroups = [
    {
        label: '📉 逢低买入（抄底）',
        items: [
            { value: 'drawdownFromPeak', label: '高点回撤', description: '价格自历史高点明显回撤' },
            { value: 'newLow', label: '创新低（破底）', description: '跌破过去 N 日最低点' },
            { value: 'priceStreak_down', label: '连续下跌（连阴）', description: '连续多天收盘走低' },
        ],
    },
    {
        label: '🚀 趋势跟随（追涨）',
        items: [
            { value: 'newHigh', label: '创新高（突破）', description: '突破过去 N 日最高价' },
            { value: 'priceStreak_up', label: '连续上涨（连阳）', description: '连续多天收盘走高' },
            { value: 'periodReturn_up', label: '近期强势（急涨）', description: '短期涨幅过大' },
        ],
    },
    {
        label: '📊 技术指标',
        items: [
            { value: 'periodReturn_down', label: '近期大跌幅', description: '短期跌幅过大' },
            { value: 'rsi', label: 'RSI 超买/超卖', description: '经典动量指标' },
            { value: 'maCross', label: '均线交叉', description: '短期均线与长期均线交叉' },
        ],
    },
] as const

export const baseConditionDefaults = {
    drawdownFromPeak: { days: 60, percentage: 15 },
    priceStreak: { direction: 'down', count: 3, unit: 'day' },
    rsi: { period: 14, threshold: 30, operator: 'below' },
    newHigh: { days: 60 },
    newLow: { days: 60 },
    periodReturn: { days: 30, percentage: 10, direction: 'up' },
    maCross: { period: 20, direction: 'above' },
}

export const conditionMap = {
    drawdownFromPeak: { type: 'drawdownFromPeak', defaults: baseConditionDefaults.drawdownFromPeak },
    newLow: { type: 'newLow', defaults: baseConditionDefaults.newLow },
    newHigh: { type: 'newHigh', defaults: baseConditionDefaults.newHigh },
    priceStreak_down: { type: 'priceStreak', defaults: { ...baseConditionDefaults.priceStreak, direction: 'down' } },
    priceStreak_up: { type: 'priceStreak', defaults: { ...baseConditionDefaults.priceStreak, direction: 'up' } },
    periodReturn_up: { type: 'periodReturn', defaults: { ...baseConditionDefaults.periodReturn, direction: 'up' } },
    periodReturn_down: { type: 'periodReturn', defaults: { ...baseConditionDefaults.periodReturn, direction: 'down' } },
    rsi: { type: 'rsi', defaults: baseConditionDefaults.rsi },
    maCross: { type: 'maCross', defaults: baseConditionDefaults.maCross },
} as const

export type TriggerOptionKey = keyof typeof conditionMap

export const getConditionConfig = (key: TriggerOptionKey) => conditionMap[key]

export const getConditionKeyFromTrigger = (condition: TriggerCondition): TriggerOptionKey => {
    switch (condition.type) {
        case 'drawdownFromPeak':
            return 'drawdownFromPeak'
        case 'newLow':
            return 'newLow'
        case 'newHigh':
            return 'newHigh'
        case 'priceStreak':
            return condition.params?.direction === 'up' ? 'priceStreak_up' : 'priceStreak_down'
        case 'periodReturn':
            return condition.params?.direction === 'down' ? 'periodReturn_down' : 'periodReturn_up'
        case 'rsi':
            return 'rsi'
        case 'maCross':
            return 'maCross'
        default:
            return 'drawdownFromPeak'
    }
}
