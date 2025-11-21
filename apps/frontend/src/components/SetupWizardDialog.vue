<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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

const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits(['update:open', 'completed'])

const store = useStrategyStore()

const ETF_OPTIONS = [
    { value: 'VOO', name: 'Vanguard S&P 500 ETF', desc: '最大最便宜的“美股500强”一站式打包' },
    { value: 'QQQ', name: 'Invesco QQQ Trust', desc: '纳指100科技龙头“信仰基”' },
    { value: 'VTI', name: 'Vanguard Total Stock Market ETF', desc: '一只基金=整个美股（大+中+小3500只）' },
    { value: 'VUG', name: 'Vanguard Growth ETF', desc: '大盘成长风格“增强版”' },
    { value: 'IJR', name: 'iShares Core S&P Small-Cap ETF', desc: '小盘宽基“工具人”，交易量大' },
    { value: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', desc: '高股息+质量筛选，散户“收息最爱”' },
    { value: 'IXUS', name: 'iShares Core MSCI Total Intl ETF', desc: '一键配齐“除美外的全球股票”' },
]

const etfSymbol = ref('QQQ')
const startDate = ref('2020-01-01')
const today = new Date().toISOString().split('T')[0]
const endDate = ref(today)
const initialCapital = ref(10000)

watch(() => props.open, (isOpen) => {
    if (isOpen && store.config.etfSymbol) {
        etfSymbol.value = store.config.etfSymbol
        startDate.value = store.config.startDate || '2020-01-01'
        endDate.value = store.config.endDate || today
        initialCapital.value = store.config.initialCapital || 10000
    }
})

const selectedEtf = computed(() => ETF_OPTIONS.find(e => e.value === etfSymbol.value))

const handleSave = () => {
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
                <DialogTitle>第一步：设置回测基础参数</DialogTitle>
                <DialogDescription>
                    请输入您想要回测的 ETF 代码及时间范围。
                </DialogDescription>
            </DialogHeader>
            <div class="grid gap-4 py-4">
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="etf" class="text-right">
                        ETF 代码
                    </Label>
                    <div class="col-span-3">
                        <Select v-model="etfSymbol">
                            <SelectTrigger>
                                <span v-if="selectedEtf" class="flex items-center gap-2 truncate">
                                    <span class="font-medium">{{ selectedEtf.value }}</span>
                                    <span class="text-slate-500 text-xs truncate">{{ selectedEtf.name }}</span>
                                </span>
                                <span v-else class="text-muted-foreground">选择 ETF</span>
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
                        开始日期
                    </Label>
                    <Input id="start-date" type="date" v-model="startDate" class="col-span-3" />
                </div>
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="end-date" class="text-right">
                        结束日期
                    </Label>
                    <Input id="end-date" type="date" v-model="endDate" class="col-span-3" />
                </div>
                <div class="grid grid-cols-4 items-center gap-4">
                    <Label for="capital" class="text-right">
                        初始本金
                    </Label>
                    <div class="col-span-3 relative">
                        <span class="absolute left-3 top-2.5 text-slate-500">$</span>
                        <Input id="capital" type="number" v-model="initialCapital" class="pl-7" />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" @click="$emit('update:open', false)">取消</Button>
                <Button type="submit" @click="handleSave">开始设计策略</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
