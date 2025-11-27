// src/lib/position-sizer.ts
import { AccountState } from '../types';

export class PositionSizer {
	static calculateBuyQuantity(
		value: { type: string; amount: number },
		accountState: AccountState,
		currentPrice: number
	): number {
		let amountToSpend = 0;

		switch (value.type) {
			case 'fixedAmount':
				amountToSpend = value.amount;
				break;
			case 'cashPercent':
				amountToSpend = accountState.cash * value.amount / 100;
				break;
			case 'totalValuePercent':
				const targetValue = accountState.totalValue * value.amount / 100;
				const currentValue = accountState.positions * currentPrice;
				const additionalValue = targetValue - currentValue;
				if (additionalValue > 0) {
					amountToSpend = additionalValue;
				}
				break;
			default:
				amountToSpend = 0;
		}

		// 核心修正：确保购买金额不超过可用现金
		amountToSpend = Math.min(amountToSpend, accountState.cash);

		if (amountToSpend <= 0) return 0;
		return amountToSpend / currentPrice;
	}

	static calculateSellQuantity(
		value: { type: string; amount: number },
		accountState: AccountState,
		currentPrice: number
	): number {
		switch (value.type) {
			case 'fixedAmount':
				return value.amount / currentPrice;
			case 'positionPercent':
				return accountState.positions * value.amount / 100;
			case 'totalValuePercent':
				// 卖出直到持仓价值等于总价值的百分比
				const targetValue = accountState.totalValue * value.amount / 100;
				const currentPositionValue = accountState.positions * currentPrice;
				const amountToSell = currentPositionValue - targetValue;

				if (amountToSell > 0) {
					return amountToSell / currentPrice;
				}
				return 0;
			default:
				return 0;
		}
	}
}
