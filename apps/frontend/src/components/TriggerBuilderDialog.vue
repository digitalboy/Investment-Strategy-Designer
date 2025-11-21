<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStrategyStore } from '@/stores/strategy'
import type { Trigger, TriggerCondition, TriggerAction } from '@/types'
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
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits(['update:open'])

const store = useStrategyStore()

// Condition State
const conditionType = ref<string>('drawdownFromPeak')
const conditionParams = ref<any>({
    days: 60,
    percentage: 15,
    direction: 'down',
    count: 3,
    unit: 'day',
    period: 14,
    threshold: 30,
    operator: 'below'
})

// Action State
const actionType = ref<'buy' | 'sell'>('buy')
const actionValueType = ref<string>('fixedAmount')
const actionAmount = ref(1000)

// Cooldown State
const enableCooldown = ref(true)
const cooldownDays = ref(5)

// Reset form when dialog opens
watch(() => props.open, (newVal) => {
    if (newVal) {
        conditionType.value = 'drawdownFromPeak'
        conditionParams.value = {
            days: 60,
            percentage: 15,
            direction: 'down',
            count: 3,
            unit: 'day',
            period: 14,
            threshold: 30,
            operator: 'below'
        }
        actionType.value = 'buy'
        actionValueType.value = 'fixedAmount'
        actionAmount.value = 1000
        enableCooldown.value = true
        cooldownDays.value = 5
    }
})

const handleSave = () => {
    try {
        let condition: TriggerCondition

        if (conditionType.value === 'drawdownFromPeak') {
            condition = {
                type: 'drawdownFromPeak',
                params: {
                    days: Number(conditionParams.value.days),
                    percentage: Number(conditionParams.value.percentage)
                }
            }
        } else if (conditionType.value === 'priceStreak') {
            condition = {
                type: 'priceStreak',
                params: {
                    direction: conditionParams.value.direction,
                    count: Number(conditionParams.value.count),
                    unit: conditionParams.value.unit
                }
            }
        } else if (conditionType.value === 'rsi') {
            condition = {
                type: 'rsi',
                params: {
                    period: Number(conditionParams.value.period),
                    threshold: Number(conditionParams.value.threshold),
                    operator: conditionParams.value.operator
                }
            }
        } else {
            // Default fallback
            condition = {
                type: 'drawdownFromPeak',
                params: { days: 60, percentage: 15 }
            }
        }

        const action: TriggerAction = {
            type: actionType.value,
            value: {
                type: actionValueType.value as any,
                amount: Number(actionAmount.value)
            }
        }

        const trigger: Trigger = {
            condition,
            action,
            cooldown: enableCooldown.value ? { days: Number(cooldownDays.value) } : undefined
        }

        store.addTrigger(trigger)
        emit('update:open', false)
    } catch (error) {
        console.error('Error in handleSave:', error);
    }
}
</script><template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>创建交易触发器</DialogTitle>
                <DialogDescription>
                    定义“如果...那么...”规则来执行交易。
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-6 py-4">
                <!-- IF Condition -->
                <div class="space-y-3 border-b pb-4">
                    <h3 class="font-semibold text-slate-900">如果 (IF)...</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <Label>触发条件类型</Label>
                            <Select v-model="conditionType">
                                <SelectTrigger>
                                    <SelectValue placeholder="选择条件" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>价格行为</SelectLabel>
                                        <SelectItem value="drawdownFromPeak">从高点回撤</SelectItem>
                                        <SelectItem value="priceStreak">连续涨/跌</SelectItem>
                                        <SelectLabel>技术指标</SelectLabel>
                                        <SelectItem value="rsi">RSI 超买/超卖</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <!-- Dynamic Params -->
                    <div v-if="conditionType === 'drawdownFromPeak'"
                        class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md">
                        <div>
                            <Label>过去多少天的高点</Label>
                            <div class="relative">
                                <Input type="number" v-model="conditionParams.days" />
                                <span class="absolute right-3 top-2.5 text-xs text-slate-500">天</span>
                            </div>
                        </div>
                        <div>
                            <Label>下跌超过</Label>
                            <div class="relative">
                                <Input type="number" v-model="conditionParams.percentage" />
                                <span class="absolute right-3 top-2.5 text-xs text-slate-500">%</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="conditionType === 'priceStreak'"
                        class="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-md">
                        <div>
                            <Label>方向</Label>
                            <Select v-model="conditionParams.direction">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="up">上涨</SelectItem>
                                    <SelectItem value="down">下跌</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>连续</Label>
                            <div class="relative">
                                <Input type="number" v-model="conditionParams.count" />
                                <span class="absolute right-3 top-2.5 text-xs text-slate-500">次</span>
                            </div>
                        </div>
                        <div>
                            <Label>单位</Label>
                            <Select v-model="conditionParams.unit">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">天</SelectItem>
                                    <SelectItem value="week">周</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div v-if="conditionType === 'rsi'" class="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-md">
                        <div>
                            <Label>周期</Label>
                            <Input type="number" v-model="conditionParams.period" />
                        </div>
                        <div>
                            <Label>比较</Label>
                            <Select v-model="conditionParams.operator">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="above">高于</SelectItem>
                                    <SelectItem value="below">低于</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>阈值</Label>
                            <Input type="number" v-model="conditionParams.threshold" />
                        </div>
                    </div>
                </div>

                <!-- THEN Action -->
                <div class="space-y-3 border-b pb-4">
                    <h3 class="font-semibold text-slate-900">那么 (THEN)...</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <Label>操作</Label>
                            <Select v-model="actionType">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="buy">买入</SelectItem>
                                    <SelectItem value="sell">卖出</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>金额类型</Label>
                            <Select v-model="actionValueType">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixedAmount">固定金额 ($)</SelectItem>
                                    <SelectItem value="cashPercent">可用现金百分比 (%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md">
                        <div>
                            <Label>数值</Label>
                            <Input type="number" v-model="actionAmount" />
                        </div>
                    </div>
                </div>

                <!-- AND Cooldown -->
                <div class="space-y-3">
                    <h3 class="font-semibold text-slate-900">并且 (AND)...</h3>
                    <div class="flex items-center space-x-2">
                        <input type="checkbox" id="cooldown" v-model="enableCooldown"
                            class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <Label for="cooldown">启用冷却期</Label>
                    </div>
                    <div v-if="enableCooldown" class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-md">
                        <div>
                            <Label>冷却天数</Label>
                            <div class="relative">
                                <Input type="number" v-model="cooldownDays" />
                                <span class="absolute right-3 top-2.5 text-xs text-slate-500">天</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="$emit('update:open', false)">取消</Button>
                <Button @click="handleSave">添加此规则</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
