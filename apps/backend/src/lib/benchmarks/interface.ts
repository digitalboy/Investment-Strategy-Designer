import { ETFDataPoint, PerformanceMetrics } from '../../types';

export interface BenchmarkResult {
    equityCurve: number[];
    stats: PerformanceMetrics;
}

export interface BenchmarkStrategy {
    calculate(
        data: ETFDataPoint[],
        dates: string[],
        initialCapital: number,
        context?: any
    ): BenchmarkResult;
}
