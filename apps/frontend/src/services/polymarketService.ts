import axios from 'axios'

const POLYMARKET_API_BASE_URL = 'https://polymarket-finance-tracker.digitalboyzone.workers.dev/api'

/**
 * Represents an outcome in a prediction market
 */
export interface MarketOutcome {
    name: string
    price: number  // Probability (0-1)
}

/**
 * Represents a specific market/question within an event
 */
export interface PredictionMarket {
    question: string
    volume: number
    outcomes: MarketOutcome[]
    winner?: string
    closed: boolean
}

/**
 * Represents a prediction market event (e.g., "Fed Interest Rate Decision")
 */
export interface MarketEvent {
    id: string
    title: string
    volume: number
    startDate: string
    endDate: string
    image: string
    url: string
    markets: PredictionMarket[]
}

/**
 * Response metadata
 */
export interface MarketMeta {
    total: number
    limit: number
    hasMore: boolean
    lastUpdated: string
}

/**
 * API response structure
 */
export interface MarketResponse {
    success: boolean
    data: MarketEvent[]
    meta: MarketMeta
}

/**
 * Query parameters for fetching markets
 */
export interface MarketQueryParams {
    limit?: number      // Number of results (default: 10)
    minVolume?: number  // Minimum trading volume filter (default: 10000)
    q?: string          // Search keywords
}

/**
 * Simplified market data for chart display
 */
export interface ChartMarketData {
    id: string
    title: string
    primaryOutcome: string
    probability: number  // 0-100 percentage
    volume: number
    endDate: string
    url: string
}

/**
 * Market event data formatted for chart timeline annotations
 */
export interface ChartAnnotationMarket {
    id: string
    title: string
    startDate: string  // YYYY-MM-DD format
    endDate: string    // YYYY-MM-DD format
    volume: number
    volumeFormatted: string
    url: string
    closed: boolean
    winner?: string
    primaryQuestion: string
    outcomes: { name: string; probability: number }[]
    color: string  // Based on outcome/status
}

export const polymarketService = {
    /**
     * Fetch trending financial prediction markets
     */
    async getTrendingMarkets(params: MarketQueryParams = {}): Promise<MarketResponse> {
        const response = await axios.get<MarketResponse>(`${POLYMARKET_API_BASE_URL}/finance/trending`, {
            params: {
                limit: params.limit ?? 10,
                minVolume: params.minVolume ?? 10000,
                q: params.q
            }
        })
        return response.data
    },

    /**
     * Search markets by keyword
     */
    async searchMarkets(keyword: string, limit: number = 10): Promise<MarketResponse> {
        return this.getTrendingMarkets({ q: keyword, limit })
    },

    /**
     * Get Fed-related prediction markets (interest rate decisions, etc.)
     */
    async getFedMarkets(limit: number = 5): Promise<MarketResponse> {
        return this.getTrendingMarkets({ q: 'fed', limit })
    },

    /**
     * Get recession-related prediction markets
     */
    async getRecessionMarkets(limit: number = 5): Promise<MarketResponse> {
        return this.getTrendingMarkets({ q: 'recession', limit })
    },

    /**
     * Get inflation-related prediction markets
     */
    async getInflationMarkets(limit: number = 5): Promise<MarketResponse> {
        return this.getTrendingMarkets({ q: 'inflation', limit })
    },

    /**
     * Transform market events into simplified chart data format
     * Extracts the primary "Yes" outcome probability from each market
     */
    transformForChart(events: MarketEvent[]): ChartMarketData[] {
        const chartData: ChartMarketData[] = []

        for (const event of events) {
            // Get the first market (usually the main prediction)
            const primaryMarket = event.markets[0]
            if (!primaryMarket || primaryMarket.closed) continue

            // Find "Yes" outcome probability
            const yesOutcome = primaryMarket.outcomes.find(o =>
                o.name.toLowerCase() === 'yes'
            )

            if (yesOutcome) {
                chartData.push({
                    id: event.id,
                    title: event.title,
                    primaryOutcome: primaryMarket.question,
                    probability: Math.round(yesOutcome.price * 100),
                    volume: event.volume,
                    endDate: event.endDate,
                    url: event.url
                })
            }
        }

        return chartData
    },

    /**
     * Format volume for display (e.g., 1234567 -> "$1.23M")
     */
    formatVolume(volume: number): string {
        if (volume >= 1_000_000) {
            return `$${(volume / 1_000_000).toFixed(2)}M`
        } else if (volume >= 1_000) {
            return `$${(volume / 1_000).toFixed(1)}K`
        }
        return `$${volume}`
    },

    /**
     * Get color based on probability
     * Green for high probability, red for low, yellow for uncertain
     */
    getProbabilityColor(probability: number): string {
        if (probability >= 70) return '#22c55e' // green
        if (probability <= 30) return '#ef4444' // red
        return '#eab308' // yellow (uncertain)
    },

    /**
     * Transform market events into chart annotation format for timeline display
     * Each event becomes a horizontal line segment on the chart
     */
    transformForAnnotations(events: MarketEvent[], chartDateRange?: { start: string; end: string }): ChartAnnotationMarket[] {
        const annotations: ChartAnnotationMarket[] = []

        for (const event of events) {
            const startDatePart = event.startDate?.split('T')[0]
            const endDatePart = event.endDate?.split('T')[0]

            // Skip if dates are invalid
            if (!startDatePart || !endDatePart) continue

            // Skip if outside chart date range
            if (chartDateRange) {
                if (endDatePart < chartDateRange.start || startDatePart > chartDateRange.end) {
                    continue
                }
            }

            const primaryMarket = event.markets[0]
            if (!primaryMarket) continue

            // Parse outcomes with probabilities
            const outcomes = primaryMarket.outcomes.map((name, idx) => {
                // Handle both old format (string array) and new format (object array)
                const outcomeName = typeof name === 'string' ? name : (name as any).name
                const price = Array.isArray((primaryMarket as any).prices)
                    ? (primaryMarket as any).prices[idx]
                    : (name as any).price || 0
                return {
                    name: outcomeName,
                    probability: Math.round(price * 100)
                }
            })

            // Determine color based on status
            let color = '#a855f7' // purple default for active
            if (primaryMarket.closed) {
                if (primaryMarket.winner === 'Yes') {
                    color = '#22c55e' // green - Yes won
                } else if (primaryMarket.winner === 'No') {
                    color = '#ef4444' // red - No won
                } else {
                    color = '#64748b' // gray - other outcome
                }
            } else {
                // Active market - color by leading probability
                const yesProb = outcomes.find(o => o.name === 'Yes')?.probability || 0
                if (yesProb >= 70) color = '#22c55e'
                else if (yesProb <= 30) color = '#ef4444'
                else color = '#eab308' // yellow - uncertain
            }

            annotations.push({
                id: event.id,
                title: event.title,
                startDate: startDatePart,
                endDate: endDatePart,
                volume: event.volume,
                volumeFormatted: this.formatVolume(event.volume),
                url: event.url,
                closed: primaryMarket.closed,
                winner: primaryMarket.winner,
                primaryQuestion: primaryMarket.question,
                outcomes,
                color
            })
        }

        // Sort by end date (most recent first)
        annotations.sort((a, b) => b.endDate.localeCompare(a.endDate))

        return annotations
    },

    /**
     * Generate Chart.js annotation plugin config for market events
     * Creates horizontal line segments showing when each market was active
     */
    generateChartAnnotations(
        markets: ChartAnnotationMarket[],
        chartDates: string[],
        baseYPosition: number = 0.05  // Position as fraction of chart height from top
    ): Record<string, any> {
        const annotations: Record<string, any> = {}

        if (!chartDates.length || !markets.length) return annotations

        const chartStart = chartDates[0]
        const chartEnd = chartDates[chartDates.length - 1]

        // Guard against undefined dates
        if (!chartStart || !chartEnd) return annotations

        markets.forEach((market, index) => {
            // Clamp dates to chart range
            const xMin = market.startDate < chartStart ? chartStart : market.startDate
            const xMax = market.endDate > chartEnd ? chartEnd : market.endDate

            // Skip if no overlap with chart
            if (xMin > chartEnd || xMax < chartStart) return

            // Stagger vertical positions to avoid overlap
            const yPos = baseYPosition + (index % 6) * 0.04

            annotations[`polymarket_${market.id}`] = {
                type: 'line',
                xMin,
                xMax,
                yMin: yPos,
                yMax: yPos,
                yScaleID: 'yPolymarket',
                borderColor: market.color,
                borderWidth: 6,
                borderCapStyle: 'round',
                label: {
                    display: true,
                    content: market.closed ? '✓' : '⏳',
                    position: 'end',
                    backgroundColor: market.color,
                    color: '#fff',
                    font: { size: 10, weight: 'bold' },
                    padding: 2,
                    borderRadius: 10,
                }
            }
        })

        return annotations
    }
}
