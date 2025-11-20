// src/lib/cache.ts
import { ETFData } from '../types';

export class CacheService {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async getETFData(symbol: string): Promise<ETFData | null> {
    try {
      const data = await this.kv.get(`ETF:${symbol}`, 'json');
      return data as ETFData | null;
    } catch (error) {
      console.error(`Error getting ETF data from cache for ${symbol}:`, error);
      return null;
    }
  }

  async setETFData(symbol: string, data: ETFData): Promise<void> {
    try {
      await this.kv.put(`ETF:${symbol}`, JSON.stringify(data), { 
        expirationTtl: 86400 // 24小时过期
      });
    } catch (error) {
      console.error(`Error setting ETF data to cache for ${symbol}:`, error);
    }
  }

  async invalidateETFData(symbol: string): Promise<void> {
    try {
      await this.kv.delete(`ETF:${symbol}`);
    } catch (error) {
      console.error(`Error invalidating ETF data from cache for ${symbol}:`, error);
    }
  }
}