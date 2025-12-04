## API Documentation (OpenAPI 3.1)

```yaml
openapi: 3.1.0
info:
  title: Polymarket Finance Tracker API
  version: 1.0.0
  description: A service to fetch high-volume, finance-related prediction markets from Polymarket for backtesting and analysis.
servers:
  - url: https://polymarket-finance-tracker.digitalboyzone.workers.dev
    description: Cloudflare Production Server
  - url: http://localhost:8787
    description: Local Development Server
paths:
  /api/finance/trending:
    get:
      summary: Get trending financial markets
      description: Fetches a list of active and closed financial markets, filtered by volume and relevance.
      parameters:
        - name: limit
          in: query
          description: Maximum number of results to return.
          required: false
          schema:
            type: integer
            default: 10
            minimum: 1
            maximum: 1000
        - name: minVolume
          in: query
          description: Minimum total volume (in USD) required for a market to be included.
          required: false
          schema:
            type: number
            default: 10000
        - name: q
          in: query
          description: Comma-separated list of custom search keywords. If omitted, uses a default set of financial terms (finance, economics, fed, stocks, etc.).
          required: false
          schema:
            type: string
            example: "gold,bitcoin,oil"
      responses:
        '200':
          description: Successful response with a list of cleaned market data.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/MarketEvent'
                  meta:
                    type: object
                    properties:
                      fetchedAt:
                        type: string
                        format: date-time
                        example: "2025-12-04T17:34:24.493Z"
                      source:
                        type: string
                        example: "Polymarket Gamma API"
                      documentation:
                        type: string
                        example: "https://docs.polymarket.com/api-reference/search/search-markets-events-and-profiles"
        '500':
          description: Internal Server Error
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: false
                  error:
                    type: string
                    example: "Failed to fetch financial markets"

components:
  schemas:
    MarketEvent:
      type: object
      description: Represents a high-level event containing one or more specific prediction markets.
      properties:
        id:
          type: string
          description: Unique Event ID.
          example: "27824"
        title:
          type: string
          description: Title of the event.
          example: "Fed decision in October?"
        volume:
          type: number
          description: Total volume of the event (sum of all sub-markets).
          example: 252485550.016563
        liquidity:
          type: number
          description: Total liquidity.
          example: 0
        startDate:
          type: string
          format: date-time
          description: When the event started/opened.
          example: "2025-06-19T16:50:25.707245Z"
        endDate:
          type: string
          format: date-time
          description: When the event is scheduled to end or closed.
          example: "2025-10-29T12:00:00Z"
        image:
          type: string
          format: uri
          description: URL to the event image.
          example: "https://polymarket-upload.s3.us-east-2.amazonaws.com/jerome+powell+glasses1.png"
        url:
          type: string
          format: uri
          description: Direct link to the Polymarket event page.
          example: "https://polymarket.com/event/fed-decision-in-october"
        type:
          type: string
          description: Type of item (usually "event" or "market").
          example: "event"
        createdAt:
          type: string
          format: date-time
          description: Creation timestamp.
          example: "2025-06-19T16:29:53.953577Z"
        volume24hr:
          type: number
          description: Volume in the last 24 hours.
          nullable: true
        volume1wk:
          type: number
          description: Volume in the last 1 week.
          example: 122395248.04656
        markets:
          type: array
          description: List of specific prediction markets within this event.
          items:
            $ref: '#/components/schemas/MarketOutcome'

    MarketOutcome:
      type: object
      description: A specific prediction question/contract within an event.
      properties:
        question:
          type: string
          description: The specific question being bet on.
          example: "Fed decreases interest rates by 50+ bps after October 2025 meeting?"
        volume:
          type: number
          description: Volume for this specific market.
          example: 52589989.131546
        outcomes:
          type: array
          description: Possible outcomes (e.g., Yes, No).
          items:
            type: string
          example: ["Yes", "No"]
        prices:
          type: array
          description: Current prices or final resolution prices (0 or 1).
          items:
            type: number
          example: [0, 1]
        winner:
          type: string
          description: The winning outcome if resolved, "Pending" if active, or "Unknown" if unclear.
          example: "No"
        closed:
          type: boolean
          description: Whether this market is closed/resolved.
          example: true
```
