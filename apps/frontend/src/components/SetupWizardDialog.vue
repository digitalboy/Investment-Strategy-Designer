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
        validationError.value = '请输入有效的开始和结束日期'
        return false
    }
    if (end < start) {
        validationError.value = '结束日期必须晚于开始日期'
        return false
    }
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < MIN_RANGE_DAYS) {
        validationError.value = `回测区间至少 ${MIN_RANGE_DAYS} 天，请调整开始或结束日期`
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
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{{ t('setupWizard.step1') }}：{{ t('setupWizard.setupParameters') }}</DialogTitle>
                <DialogDescription>
                    {{ t('setupWizard.pleaseEnterETF') }}
                </DialogDescription>
            </DialogHeader>
            <div class="grid gap-4 py-4">
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="etf" class="text-right">
                        {{ t('setupWizard.etfCode') }}
                    </Label>
                    <div class="col-span-3">
                        <Select v-model="etfSymbol">
                            <SelectTrigger>
                                <span v-if="selectedEtf" class="flex items-center gap-2 truncate">
                                    <span class="font-medium">{{ selectedEtf.value }}</span>
                                    <span class="text-slate-500 text-xs truncate">{{ selectedEtf.name }}</span>
                                </span>
                                <span v-else class="text-muted-foreground">{{ t('setupWizard.selectETF') }}</span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem v-for="etf in ETF_OPTIONS" :key="etf.value" :value="etf.value">
                                        <div class="flex flex-col items-start text-left py-1">
                                            <span class="font-medium">{{ etf.value }} - {{ etf.name }}</span>
                                            <span class="text-xs text-slate-500">{{ etf.desc }}</span>
                                        </div>
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="start-date" class="text-right">
                        {{ t('setupWizard.startDate') }}
                    </Label>
                    <Input id="start-date" type="date" v-model="startDate" class="col-span-3" />
                </div>
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="end-date" class="text-right">
                        {{ t('setupWizard.endDate') }}
                    </Label>
                    <Input id="end-date" type="date" v-model="endDate" class="col-span-3" />
                </div>
                <p v-if="validationError" class="text-xs text-rose-500 text-right col-span-4">
                    {{ validationError }}
                </p>
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="capital" class="text-right">
                        {{ t('setupWizard.initialCapital') }}
                    </Label>
                    <div class="col-span-3 relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <Input id="capital" type="number" v-model="initialCapital" class="pl-7" disabled />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" @click="$emit('update:open', false)">{{ t('common.cancel') }}</Button>
                <Button type="submit" @click="handleSave">{{ t('setupWizard.startDesigningStrategy') }}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
