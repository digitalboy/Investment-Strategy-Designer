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
    notifications_enabled: number; // 0 or 1
    view_count: number;
    like_count: number;
    clone_count: number;
    comment_count: number;
    return_rate?: number;
    max_drawdown?: number;
    created_at: string;
    updated_at: string;
}

export interface StrategySummaryDTO {
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
    isPublic: boolean;
    notificationsEnabled?: boolean;
    etfSymbol?: string;
    stats: {
        views: number;
        likes: number;
        clones: number;
        comments: number;
    };
    returnRate?: number;
    maxDrawdown?: number;
    tags?: string[];
    author?: {
        email: string;
        displayName?: string;
        photoUrl?: string;
    };
    triggerCount?: number;
}

export interface CommentEntity {
    id: string;
    strategy_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user_email?: string; // Optional, joined from users table
    user_name?: string;
    user_photo?: string;
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
    | { type: 'maCross'; params: { period: number; direction: 'above' | 'below' } }
    | {
        type: 'vix';
        params: {
            mode?: 'threshold' | 'streak' | 'breakout';
            // Threshold params
            threshold?: number;
            operator?: 'above' | 'below';
            // Streak params
            streakDirection?: 'up' | 'down';
            streakCount?: number;
            // Breakout params
            breakoutType?: 'high' | 'low';
            breakoutDays?: number;
        }
    };

export interface TriggerAction {
    type: 'buy' | 'sell';
    value: {
        type: 'fixedAmount' | 'cashPercent' | 'positionPercent' | 'totalValuePercent';
        amount: number;
    };
}

export interface BacktestResultDTO {
    metadata: {
        symbol: string;
        period: string;
    };
    performance: {
        strategy: PerformanceMetrics;
        benchmark: PerformanceMetrics;
        dca: PerformanceMetrics;       // 周定投基准
    };
    charts: {
        dates: string[];
        strategyEquity: number[];
        benchmarkEquity: number[];
        dcaEquity: number[];           // 周定投净值曲线
        underlyingPrice: number[];
        vixData?: number[];
    };
    trades: Trade[];
}

export interface Trade {
    date: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
    reason: string;
}

export interface PerformanceMetrics {
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    tradeStats: TradeStats;
}

export interface TradeStats {
    totalTrades: number;
    buyCount: number;
    sellCount: number;
    totalInvested: number;
    totalProceeds: number;
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
    isPublic?: boolean;
    notificationsEnabled?: boolean;
}
