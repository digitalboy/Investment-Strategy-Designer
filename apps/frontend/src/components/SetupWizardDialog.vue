<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStrategyStore } from '@/stores/strategy'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select'
import { Lock } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits(['update:open', 'completed'])

const store = useStrategyStore()

const ETF_OPTIONS = [
    { value: 'VOO', name: 'Vanguard S&P 500 ETF', desc: t('etf.voo.description') },
    { value: 'QQQ', name: 'Invesco QQQ Trust', desc: t('etf.qqq.description') },
    { value: 'VTI', name: 'Vanguard Total Stock Market ETF', desc: t('etf.vti.description') },
    { value: 'VUG', name: 'Vanguard Growth ETF', desc: t('etf.vug.description') },
    { value: 'IJR', name: 'iShares Core S&P Small-Cap ETF', desc: t('etf.ijr.description') },
    { value: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', desc: t('etf.schd.description') },
    { value: 'IXUS', name: 'iShares Core MSCI Total Intl ETF', desc: t('etf.ixus.description') },
]

const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

const etfSymbol = ref('QQQ')
const startDate = ref('2020-01-01')
const today = formatLocalDate(new Date())
const endDate = ref(today)
const initialCapital = ref(10000)
const MIN_RANGE_DAYS = 365
const validationError = ref('')

const validateDateRange = () => {
    const start = new Date(startDate.value)
    const end = new Date(endDate.value)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        validationError.value = t('setupWizard.validation.invalidDates')
        return false
    }
    if (end < start) {
        validationError.value = t('setupWizard.validation.endBeforeStart')
        return false
    }
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < MIN_RANGE_DAYS) {
        validationError.value = t('setupWizard.validation.minRange', { days: MIN_RANGE_DAYS })
        return false
    }
    validationError.value = ''
    return true
}

watch(() => props.open, (isOpen) => {
    if (isOpen && store.config.etfSymbol) {
        etfSymbol.value = store.config.etfSymbol
        startDate.value = store.config.startDate || '2020-01-01'
        endDate.value = store.config.endDate || today
        initialCapital.value = store.config.initialCapital || 10000
    }
    if (isOpen) {
        validateDateRange()
    }
})

watch([startDate, endDate], () => {
    validateDateRange()
})

const selectedEtf = computed(() => ETF_OPTIONS.find(e => e.value === etfSymbol.value))

const handleSave = () => {
    if (!validateDateRange()) {
        return
    }
    store.setConfig({
        etfSymbol: etfSymbol.value,
        startDate: startDate.value,
        endDate: endDate.value,
        initialCapital: initialCapital.value
    })
    emit('update:open', false)
    emit('completed')
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent
            class="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-linear-to-br from-white via-blue-50/30 to-indigo-50/20">
            <!-- 顶部装饰渐变条 -->
            <div class="h-1.5 bg-linear-to-r from-indigo-500 via-blue-500 to-violet-500"></div>

            <!-- Header Section with Icon -->
            <DialogHeader class="px-8 pt-8 pb-6 space-y-3">
                <div class="flex items-center gap-4">
                    <div
                        class="flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
                        <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                            </path>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <DialogTitle
                            class="text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            {{ t('setupWizard.step1') }}：{{ t('setupWizard.setupParameters') }}
                        </DialogTitle>
                        <DialogDescription class="text-slate-600 mt-1.5">
                            {{ t('setupWizard.pleaseEnterETF') }}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <!-- Form Section -->
            <div class="px-8 py-6 space-y-7">
                <!-- ETF Selection -->
                <div class="space-y-4">
                    <Label class="text-sm font-semibold text-slate-700 flex items-center gap-2 ml-1">
                        <div class="p-1 rounded-md bg-indigo-50 text-indigo-600">
                            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z">
                                </path>
                            </svg>
                        </div>
                        {{ t('setupWizard.etfCode') }}
                    </Label>

                    <Select v-model="etfSymbol">
                        <SelectTrigger
                            class="w-full h-24 pl-20 pr-4 bg-white border-2 border-slate-200 rounded-lg shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group relative overflow-visible flex items-center">

                            <!-- 背景装饰 -->
                            <div
                                class="absolute right-0 top-0 h-full w-3/4 bg-linear-to-l from-slate-50 to-transparent pointer-events-none opacity-60 rounded-r-lg">
                            </div>

                            <!-- 贴纸图标 - 悬浮在左侧 -->
                            <div
                                class="absolute -left-2 top-1/2 -translate-y-1/2 z-20 shrink-0 transition-all duration-500 ease-out transform -rotate-12 group-hover:rotate-6 group-hover:scale-110 origin-center drop-shadow-2xl">
                                <!-- 主贴纸 -->
                                <div
                                    class="relative w-14 h-14 flex items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 via-blue-600 to-violet-600 text-white border-3 border-white shadow-[0_10px_24px_-6px_rgba(79,70,229,0.5)] group-hover:shadow-[0_16px_32px_-6px_rgba(79,70,229,0.6)]">
                                    <span class="text-2xl font-black tracking-tighter drop-shadow-sm">
                                        {{ selectedEtf ? selectedEtf.value.charAt(0) : '?' }}
                                    </span>

                                    <!-- 装饰光晕 -->
                                    <div
                                        class="absolute inset-0 rounded-xl bg-linear-to-br from-white/20 to-transparent pointer-events-none">
                                    </div>

                                    <!-- 装饰小圆点 -->
                                    <div
                                        class="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-linear-to-br from-yellow-300 to-yellow-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-pulse">
                                        <svg class="w-3 h-3 text-yellow-900" fill="none" stroke="currentColor"
                                            viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3"
                                                d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>

                                    <!-- 装饰星星 -->
                                    <div
                                        class="absolute -top-0.5 -left-0.5 w-3 h-3 text-yellow-300 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <svg fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <!-- 文字信息容器 -->
                            <div class="flex items-center gap-3 flex-1 text-left min-w-0 relative z-10">
                                <!-- ETF 代码 -->
                                <span v-if="selectedEtf"
                                    class="text-2xl font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors shrink-0">
                                    {{ selectedEtf.value }}
                                </span>
                                <span v-else class="text-slate-400 font-medium text-lg">{{
                                    t('setupWizard.selectETF') }}</span>

                                <!-- ETF 全名 -->
                                <span v-if="selectedEtf"
                                    class="text-xs font-medium text-slate-500 tracking-wide truncate flex-1">
                                    {{ selectedEtf.name }}
                                </span>
                            </div>
                        </SelectTrigger>

                        <SelectContent class="max-h-[300px] rounded-xl border-slate-100 shadow-xl shadow-slate-200/50">
                            <SelectGroup class="p-2">
                                <SelectItem v-for="etf in ETF_OPTIONS" :key="etf.value" :value="etf.value"
                                    class="rounded-lg cursor-pointer py-3 my-1 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50/80">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                                            {{ etf.value.charAt(0) }}
                                        </div>
                                        <div class="flex flex-col text-left">
                                            <span class="font-bold text-slate-700">{{ etf.value }}</span>
                                            <span class="text-xs text-slate-500">{{ etf.name }}</span>
                                        </div>
                                    </div>
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Date Range -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-3">
                        <Label for="start-date" class="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                                </path>
                            </svg>
                            {{ t('setupWizard.startDate') }}
                        </Label>
                        <Input id="start-date" type="date" v-model="startDate"
                            class="h-11 border-slate-200 hover:border-blue-300 focus:border-blue-500 transition-colors bg-white shadow-sm" />
                    </div>
                    <div class="space-y-3">
                        <Label for="end-date" class="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                                </path>
                            </svg>
                            {{ t('setupWizard.endDate') }}
                        </Label>
                        <Input id="end-date" type="date" v-model="endDate"
                            class="h-11 border-slate-200 hover:border-violet-300 focus:border-violet-500 transition-colors bg-white shadow-sm" />
                    </div>
                </div>

                <!-- Validation Error -->
                <Transition enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
                    <div v-if="validationError"
                        class="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
                        <svg class="w-5 h-5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clip-rule="evenodd"></path>
                        </svg>
                        <p class="text-sm text-rose-700 font-medium">{{ validationError }}</p>
                    </div>
                </Transition>

                <!-- Initial Capital -->
                <div class="space-y-3">
                    <Label for="capital" class="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z">
                            </path>
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                                clip-rule="evenodd"></path>
                        </svg>
                        {{ t('setupWizard.initialCapital') }}
                    </Label>
                    <div class="relative">
                        <span
                            class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">$</span>
                        <Input id="capital" type="number" v-model="initialCapital" disabled
                            class="h-11 pl-9 pr-4 border-slate-200 bg-slate-50 text-slate-500 font-medium shadow-sm cursor-not-allowed" />
                        <div class="absolute right-3 top-1/2 -translate-y-1/2">
                            <Lock class="w-4 h-4 text-slate-600" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <DialogFooter class="px-8 py-6 bg-slate-50/80 border-t border-slate-200/60 gap-3">
                <Button variant="outline" @click="$emit('update:open', false)"
                    class="h-11 px-6 border-slate-300 hover:bg-white hover:border-slate-400 transition-all">
                    {{ t('common.cancel') }}
                </Button>
                <Button type="submit" @click="handleSave" :disabled="!!validationError"
                    class="h-11 px-8 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    {{ t('setupWizard.startDesigningStrategy') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
