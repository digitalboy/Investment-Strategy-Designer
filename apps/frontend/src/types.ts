export interface UserEntity {
    id: string;
    firebase_uid: string;
    email: string;
    created_at: string;
    last_login_at?: string;
    preferences?: string; // JSON string
}

export interface StrategyEntity {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    config: string;       // JSON string
    is_public: number;    // 0 or 1
    created_at: string;
    updated_at: string;
}

export interface StrategyConfig {
    etfSymbol: string;
    startDate?: string;
    endDate?: string;
    initialCapital: number;
    triggers: Trigger[];
}

export interface Trigger {
    condition: TriggerCondition;
    action: TriggerAction;
    cooldown?: {
        days: number;
    };
}

export type TriggerCondition =
    | { type: 'priceStreak'; params: { direction: 'up' | 'down'; count: number; unit: 'day' | 'week' } }
    | { type: 'drawdownFromPeak'; params: { days: number; percentage: number } }
    | { type: 'newHigh'; params: { days: number } }
    | { type: 'newLow'; params: { days: number } }
    | { type: 'periodReturn'; params: { days: number; percentage: number; direction: 'up' | 'down' } }
    | { type: 'rsi'; params: { period: number; threshold: number; operator: 'above' | 'below' } }
    | { type: 'maCross'; params: { period: number; direction: 'above' | 'below' } };

export interface TriggerAction {
    type: 'buy' | 'sell';
    value: {
        type: 'fixedAmount' | 'cashPercent' | 'positionPercent' | 'totalValuePercent';
        amount: number;
    };
}

export interface StrategySummaryDTO {
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
}

export interface CreateStrategyDTO {
    name: string;
    description?: string;
    config: StrategyConfig;
}

export interface UpdateStrategyDTO {
    name?: string;
    description?: string;
    config?: StrategyConfig;
}

export interface PerformanceMetrics {
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio?: number;
}

export interface BacktestResultDTO {
    metadata: {
        symbol: string;
        period: string;
    };
    performance: {
        strategy: PerformanceMetrics;
        benchmark: PerformanceMetrics;
    };
    charts: {
        dates: string[];
        strategyEquity: number[];
        benchmarkEquity: number[];
        underlyingPrice?: number[];
    };
}
