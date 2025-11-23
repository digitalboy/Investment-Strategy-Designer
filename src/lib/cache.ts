// src/lib/cache.ts
import { ETFData, ETFDataPoint } from '../types';

const KEY_PREFIX = 'MARKET:';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const FULL_REFRESH_INTERVAL_MS = 60 * 60 * 24 * 7 * 1000; // 7 days
const YAHOO_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

type MaybeExecutionContext = { waitUntil(promise: Promise<unknown>): void } | undefined;

export class CacheService {
  constructor(private readonly kv: KVNamespace) { }

  async getETFData(options: {
    symbol: string;
    startDate?: string;
    endDate?: string;
    ctx?: MaybeExecutionContext;
  }): Promise<ETFData | null> {
    const symbol = options.symbol.toUpperCase();
    const key = this.buildKey(symbol);
    let record = await this.getRecord(key);
    const now = Date.now();

    if (!record) {
      record = await this.fetchAndPersistFullHistory(symbol, key);
    } else if (now > record.nextFetchTime) {
      const shouldForceFullRefresh = now - record.lastUpdated > FULL_REFRESH_INTERVAL_MS;
      const refreshPromise = this.refreshRecord(key, record, symbol, shouldForceFullRefresh);

      if (options.ctx) {
        options.ctx.waitUntil(refreshPromise);
      } else {
        refreshPromise.catch((error) => {
          console.error(`Background refresh failed for ${symbol}`, error);
        });
      }
    }

    if (!record) {
      return null;
    }

    const slicedData = this.sliceData(record.data, options.startDate, options.endDate);
    return { ...record, data: slicedData };
  }

  async invalidateETFData(symbol: string): Promise<void> {
    await this.kv.delete(this.buildKey(symbol.toUpperCase()));
  }

  private async refreshRecord(key: string, record: ETFData, symbol: string, forceFull: boolean) {
    try {
      const updated = forceFull
        ? await this.buildRecord(symbol, await fetchYahooRange(symbol))
        : await this.buildIncrementalRecord(symbol, record);

      await this.saveRecord(key, updated);
    } catch (error) {
      console.error(`Failed to refresh ETF cache for ${symbol}`, error);
    }
  }

  private async buildIncrementalRecord(symbol: string, record: ETFData): Promise<ETFData> {
    if (!record.lastTradeDate) {
      return this.decorateRecord(symbol, await fetchYahooRange(symbol));
    }

    const incoming = await fetchYahooRange(symbol, record.lastTradeDate);

    if (!incoming.length) {
      return {
        ...record,
        lastUpdated: Date.now(),
        nextFetchTime: computeNextFetchTime(),
      };
    }

    const merged = mergeData(record.data, incoming);
    return this.decorateRecord(symbol, merged);
  }

  private async fetchAndPersistFullHistory(symbol: string, key: string): Promise<ETFData | null> {
    try {
      const record = await this.buildRecord(symbol, await fetchYahooRange(symbol));
      await this.saveRecord(key, record);
      return record;
    } catch (error) {
      console.error(`Failed to fetch initial ETF history for ${symbol}`, error);
      return null;
    }
  }

  private async buildRecord(symbol: string, data: ETFDataPoint[]): Promise<ETFData> {
    return this.decorateRecord(symbol, data);
  }

  private decorateRecord(symbol: string, data: ETFDataPoint[]): ETFData {
    const sorted = [...data].sort((a, b) => a.d.localeCompare(b.d));
    const lastTradeDate = sorted.length ? sorted[sorted.length - 1].d : '';

    return {
      symbol,
      lastUpdated: Date.now(),
      lastTradeDate,
      nextFetchTime: computeNextFetchTime(),
      data: sorted,
    };
  }

  private sliceData(data: ETFDataPoint[], startDate?: string, endDate?: string): ETFDataPoint[] {
    if (!startDate && !endDate) {
      return data;
    }

    const start = startDate ? Date.parse(startDate) : Number.NEGATIVE_INFINITY;
    const end = endDate ? Date.parse(endDate) : Number.POSITIVE_INFINITY;

    return data.filter((point) => {
      const timestamp = Date.parse(point.d);
      return timestamp >= start && timestamp <= end;
    });
  }

  private async getRecord(key: string): Promise<ETFData | null> {
    try {
      return (await this.kv.get(key, 'json')) as ETFData | null;
    } catch (error) {
      console.error(`Error reading cache for ${key}`, error);
      return null;
    }
  }

  private async saveRecord(key: string, record: ETFData): Promise<void> {
    try {
      await this.kv.put(key, JSON.stringify(record), { expirationTtl: CACHE_TTL_SECONDS });
    } catch (error) {
      console.error(`Error writing cache for ${key}`, error);
    }
  }

  private buildKey(symbol: string) {
    return `${KEY_PREFIX}${symbol}`;
  }
}

function mergeData(existing: ETFDataPoint[], incoming: ETFDataPoint[]): ETFDataPoint[] {
  const map = new Map<string, ETFDataPoint>();
  existing.forEach((point) => map.set(point.d, point));
  incoming.forEach((point) => map.set(point.d, point));
  return Array.from(map.values()).sort((a, b) => a.d.localeCompare(b.d));
}

function computeNextFetchTime(now = Date.now()): number {
  return now + REFRESH_INTERVAL_MS;
}

async function fetchYahooRange(symbol: string, startDate?: string, endDate?: string): Promise<ETFDataPoint[]> {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end);

  if (!startDate) {
    start.setFullYear(start.getFullYear() - 10);
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date range supplied');
  }

  if (start >= end) {
    throw new Error('Start date must be earlier than end date');
  }

  const period1 = Math.floor(start.getTime() / 1000);
  const period2 = Math.floor((end.getTime() + 24 * 60 * 60 * 1000) / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': YAHOO_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance responded with ${response.status}`);
  }

  const payload = (await response.json()) as any;
  const result = payload?.chart?.result?.[0];

  if (!result || !Array.isArray(result.timestamp)) {
    throw new Error('Yahoo Finance response is missing timestamp data');
  }

  const quotes = result.indicators?.quote?.[0];
  if (!quotes) {
    throw new Error('Yahoo Finance response is missing quote indicators');
  }

  const data: ETFDataPoint[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    const open = quotes.open?.[i];
    const high = quotes.high?.[i];
    const low = quotes.low?.[i];
    const close = quotes.close?.[i];
    const volume = quotes.volume?.[i] ?? 0;

    if ([open, high, low, close].some((value) => value === null || value === undefined || Number.isNaN(value))) {
      continue;
    }

    const dateStr = new Date(result.timestamp[i] * 1000).toISOString().split('T')[0];

    data.push({
      d: dateStr,
      o: Number(open.toFixed(2)),
      h: Number(high.toFixed(2)),
      l: Number(low.toFixed(2)),
      c: Number(close.toFixed(2)),
      v: volume,
    });
  }

  if (data.length === 0) {
    throw new Error('Yahoo Finance returned no usable OHLC data');
  }

  return data;
}
