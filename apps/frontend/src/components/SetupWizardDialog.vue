<script setup lang="ts">
import { ref } from 'vue'
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

const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits(['update:open', 'completed'])

const store = useStrategyStore()

const etfSymbol = ref('QQQ')
const startDate = ref('2020-01-01')
const endDate = ref('2024-12-31')
const initialCapital = ref(10000)

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
                    <Input id="etf" v-model="etfSymbol" placeholder="例如 QQQ" class="col-span-3" />
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
