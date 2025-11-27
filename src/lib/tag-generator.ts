// src/lib/tag-generator.ts
import type { StrategyConfig, BacktestResultDTO } from '../types';

/**
 * Generate tags for a strategy based on its configuration and backtest results
 * All tags are in English for i18n support
 */
export function generateTags(
    config: StrategyConfig,
    backtestResult?: BacktestResultDTO
): string[] {
    const tags = new Set<string>();

    // Analyze trigger conditions
    config.triggers.forEach(trigger => {
        switch (trigger.condition.type) {
            case 'rsi':
                tags.add('RSI');
                tags.add('Technical');
                break;
            case 'drawdownFromPeak':
                tags.add('Drawdown');
                tags.add('Contrarian');
                break;
            case 'priceStreak':
                tags.add('Momentum');
                tags.add('Trend');
                break;
            case 'maCross':
                tags.add('Moving Average');
                tags.add('Technical');
                break;
            case 'newHigh':
                tags.add('Breakout');
                tags.add('Momentum');
                break;
            case 'newLow':
                tags.add('Buy the Dip');
                tags.add('Contrarian');
                break;
            case 'periodReturn':
                tags.add('Return Based');
                tags.add('Momentum');
                break;
            case 'vix':
                tags.add('VIX');
                tags.add('Sentiment');
                break;
        }
    });

    // Analyze action types
    const buyCount = config.triggers.filter(t => t.action.type === 'buy').length;
    const sellCount = config.triggers.filter(t => t.action.type === 'sell').length;

    if (buyCount > 0 && sellCount > 0) {
        tags.add('Two-Way');
    } else if (buyCount > 0 && sellCount === 0) {
        tags.add('Buy Only');
    } else if (sellCount > 0 && buyCount === 0) {
        tags.add('Sell Only');
    }

    // Multi-factor analysis
    const uniqueConditions = new Set(config.triggers.map(t => t.condition.type));
    if (uniqueConditions.size >= 3) {
        tags.add('Multi-Factor');
    }

    // Analyze position sizing
    const hasFixedAmount = config.triggers.some(t => t.action.value.type === 'fixedAmount');
    const hasDynamicSizing = config.triggers.some(t =>
        ['cashPercent', 'positionPercent', 'totalValuePercent'].includes(t.action.value.type)
    );

    if (hasDynamicSizing) {
        tags.add('Dynamic Sizing');
    } else if (hasFixedAmount) {
        tags.add('Fixed Amount');
    }

    // Cooldown analysis
    const hasCooldown = config.triggers.some(t => t.cooldown && t.cooldown.days > 0);
    if (hasCooldown) {
        tags.add('Controlled Pace');
    }

    // Backtest result analysis (if available)
    if (backtestResult) {
        const { strategy } = backtestResult.performance;
        const { trades } = backtestResult;

        // Sharpe ratio
        if (strategy.sharpeRatio > 2.0) {
            tags.add('Excellent Sharpe');
        } else if (strategy.sharpeRatio > 1.5) {
            tags.add('High Sharpe');
        }

        // Max drawdown
        if (Math.abs(strategy.maxDrawdown) < 10) {
            tags.add('Low Drawdown');
        } else if (Math.abs(strategy.maxDrawdown) < 20) {
            tags.add('Moderate Risk');
        }

        // Return
        if (strategy.annualizedReturn > 20) {
            tags.add('High Return');
        } else if (strategy.annualizedReturn > 10) {
            tags.add('Solid Return');
        }

        // Trading frequency
        const tradingDays = trades.length;
        if (tradingDays > 50) {
            tags.add('High Frequency');
        } else if (tradingDays < 10) {
            tags.add('Low Frequency');
        } else {
            tags.add('Medium Frequency');
        }

        // Style classification based on risk/return
        if (strategy.annualizedReturn > 15 && Math.abs(strategy.maxDrawdown) < 15) {
            tags.add('Balanced');
        } else if (strategy.annualizedReturn > 20) {
            tags.add('Aggressive');
        } else if (Math.abs(strategy.maxDrawdown) < 10) {
            tags.add('Conservative');
        }
    }

    // Limit to top 6 tags, prioritizing condition-based tags
    const tagArray = Array.from(tags);
    return tagArray.slice(0, 6);
}
