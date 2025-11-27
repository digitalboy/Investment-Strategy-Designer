<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, Clock, Calendar, ArrowUpRight, AlertCircle } from 'lucide-vue-next'
import type { DrawdownEvent } from '@/types'

const props = defineProps<{
	drawdowns: DrawdownEvent[]
	selectedDrawdown?: DrawdownEvent | null
}>()

const emit = defineEmits<{
	select: [event: DrawdownEvent | null]
}>()

const { t } = useI18n({ useScope: 'global' })

// Ensure we only take top 5 if API returns more
const topDrawdowns = computed(() => props.drawdowns.slice(0, 5))

const formatPercent = (val: number) => `${val.toFixed(2)}%`

const getRankColor = (rank: number) => {
	switch (rank) {
		case 1: return 'bg-red-100 text-red-700 border-red-200'
		case 2: return 'bg-orange-100 text-orange-700 border-orange-200'
		case 3: return 'bg-amber-100 text-amber-700 border-amber-200'
		default: return 'bg-slate-100 text-slate-600 border-slate-200'
	}
}

const formatSimpleDate = (dateStr: string) => {
	const date = new Date(dateStr)
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// 处理点击事件，切换选中状态
const handleSelect = (event: DrawdownEvent) => {
	if (props.selectedDrawdown?.rank === event.rank) {
		emit('select', null) // 取消选中
	} else {
		emit('select', event) // 选中
	}
}

// 判断是否选中
const isSelected = (event: DrawdownEvent) => {
	return props.selectedDrawdown?.rank === event.rank
}
</script>

<template>
	<Card
		class="h-full flex flex-col border-slate-200/60 shadow-lg shadow-slate-200/40 bg-white/80 backdrop-blur-sm overflow-hidden">
		<CardHeader class="pb-3 border-b border-slate-100">
			<CardTitle class="text-base font-semibold flex items-center gap-2 text-slate-800">
				<TrendingDown class="w-4 h-4 text-rose-500" />
				{{ t('resultsReportDialog.drawdownAnalysis.title') }}
			</CardTitle>
		</CardHeader>
		<CardContent class="p-0 flex-1 overflow-y-auto custom-scrollbar">
			<div v-if="topDrawdowns.length === 0" class="p-8 text-center text-slate-400 text-sm">
				{{ t('resultsReportDialog.noData') }}
			</div>

			<Accordion v-else type="single" collapsible default-value="item-0" class="w-full">
				<AccordionItem v-for="(event, index) in topDrawdowns" :key="index" :value="`item-${index}`"
					class="border-b border-slate-50 last:border-0"
					:class="{ 'bg-rose-50/50 ring-1 ring-rose-200': isSelected(event) }">
					<AccordionTrigger class="px-4 py-3 hover:bg-slate-50/50 transition-colors group" @click="handleSelect(event)">
						<div class="flex items-center justify-between w-full pr-2">
							<div class="flex items-center gap-3">
								<Badge variant="outline"
									:class="['w-6 h-6 rounded-full flex items-center justify-center p-0 border', getRankColor(event.rank)]">
									{{ event.rank }}
								</Badge>
								<div class="flex flex-col items-start text-left">
									<span class="text-sm font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">
										{{ formatPercent(event.depthPercent) }}
									</span>
									<span class="text-[10px] text-slate-400">
										{{ formatSimpleDate(event.peakDate) }}
									</span>
								</div>
							</div>

							<!-- Status Badge (Mini) -->
							<div class="flex items-center">
								<span v-if="event.isRecovered"
									class="flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
									<Clock class="w-3 h-3 mr-1" />
									{{ event.daysToRecover }} {{ t('common.day') }}
								</span>
								<span v-else
									class="flex items-center text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
									<AlertCircle class="w-3 h-3 mr-1" />
									{{ t('resultsReportDialog.drawdownAnalysis.underwater') }}
								</span>
							</div>
						</div>
					</AccordionTrigger>

					<AccordionContent class="px-4 pb-4 bg-slate-50/30">
						<div class="grid grid-cols-2 gap-3 text-xs pt-2">
							<!-- Peak Info -->
							<div class="space-y-1">
								<span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
									<ArrowUpRight class="w-3 h-3 text-emerald-400" />
									{{ t('resultsReportDialog.drawdownAnalysis.peak') }}
								</span>
								<div class="font-medium text-slate-700">{{ formatSimpleDate(event.peakDate) }}</div>
								<div class="font-mono text-slate-500">${{ event.peakPrice.toFixed(2) }}</div>
							</div>

							<!-- Valley Info -->
							<div class="space-y-1">
								<span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
									<TrendingDown class="w-3 h-3 text-rose-400" />
									{{ t('resultsReportDialog.drawdownAnalysis.valley') }}
								</span>
								<div class="font-medium text-slate-700">{{ formatSimpleDate(event.valleyDate) }}</div>
								<div class="font-mono text-slate-500">${{ event.valleyPrice.toFixed(2) }}</div>
							</div>

							<!-- Recovery Info -->
							<div class="col-span-2 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Calendar class="w-3.5 h-3.5 text-slate-400" />
									<span class="text-slate-500">{{ t('resultsReportDialog.drawdownAnalysis.recovery') }}:</span>
								</div>
								<span v-if="event.isRecovered" class="font-medium text-emerald-700">
									{{ formatSimpleDate(event.recoveryDate!) }}
								</span>
								<span v-else class="font-medium text-rose-600">
									--
								</span>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</CardContent>
	</Card>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: #cbd5e1;
	border-radius: 20px;
}
</style>
