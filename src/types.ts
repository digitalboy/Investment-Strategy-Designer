// src/types/index.ts
// 对应 D1 数据库中的行数据

// 对应 users 表
export interface UserEntity {
  id: string;
  firebase_uid: string;
  email: string;
  created_at: string;
  last_login_at?: string;
  preferences?: string; // JSON string
}

// 对应 strategies 表
export interface StrategyEntity {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  config: string;       // 注意：在数据库中是 JSON string，取出来后需要 JSON.parse
  is_public: number;    // 0 or 1
  view_count: number;
  like_count: number;
  clone_count: number;
  created_at: string;
  updated_at: string;
}

// 对应 comments 表
export interface CommentEntity {
  id: string;
  strategy_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// 对应 likes 表
export interface LikeEntity {
  user_id: string;
  strategy_id: string;
  created_at: string;
}

// 策略配置对象 (StrategyEntity.config 解析后的类型)
export interface StrategyConfig {
  etfSymbol: string;        // e.g., "QQQ"
  startDate?: string;       // e.g., "2020-01-01" (回测时可选，保存时可能不存具体日期)
  endDate?: string;
  initialCapital: number;   // e.g., 10000
  triggers: Trigger[];      // 触发器列表
}

// 触发器定义
export interface Trigger {
  condition: TriggerCondition;
  action: TriggerAction;
  cooldown?: {
    days: number;           // 冷却期天数
  };
}

// 条件定义 (Union Type)
export type TriggerCondition =
  | { type: 'priceStreak'; params: { direction: 'up' | 'down'; count: number; unit: 'day' | 'week' } }
  | { type: 'drawdownFromPeak'; params: { days: number; percentage: number } } // 核心：回撤
  | { type: 'newHigh'; params: { days: number } }
  | { type: 'newLow'; params: { days: number } }
  | { type: 'periodReturn'; params: { days: number; percentage: number; direction: 'up' | 'down' } }
  | { type: 'rsi'; params: { period: number; threshold: number; operator: 'above' | 'below' } }
  | { type: 'maCross'; params: { period: number; direction: 'above' | 'below' } };

// 动作定义
export interface TriggerAction {
  type: 'buy' | 'sell';
  value: {
    type: 'fixedAmount' | 'cashPercent' | 'positionPercent' | 'totalValuePercent';
    amount: number; // 数值，根据 type 解释为金额或百分比
  };
}

// 数据传输对象 (DTOs)

// GET /api/v1/strategies 的响应项
export interface StrategySummaryDTO {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

// POST /api/v1/strategies 的请求体
export interface CreateStrategyDTO {
  name: string;
  description?: string;
  config: StrategyConfig; // 直接传对象，后端负责 stringify 存入 DB
}

// PUT /api/v1/strategies/:id 的请求体
export interface CreateStrategyDTO {
  name: string;
  description?: string;
  config: StrategyConfig;
  isPublic?: boolean;
}

export interface UpdateStrategyDTO {
  name?: string;
  description?: string;
  config?: StrategyConfig;
  isPublic?: boolean;
}

// 回测结果 DTO
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
    underlyingPrice: number[];
  };
}

export interface PerformanceMetrics {
  totalReturn: number;      // 百分比
  annualizedReturn: number; // 百分比
  maxDrawdown: number;      // 百分比
  sharpeRatio: number;
}

// ETF 历史数据结构 (从KV缓存或API获取)
export interface ETFDataPoint {
  d: string; // date
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

export interface ETFData {
  symbol: string;
  lastUpdated: string;
  data: ETFDataPoint[];
}

// 用户同步请求和响应DTO
export interface UserSyncResponseDTO {
  id: string;
  firebaseUid: string;
  email: string;
  createdAt: string;
}
