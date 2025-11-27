# API Endpoints Documentation

Base URL: `https://<worker-domain>/api/v1`

## 1. Authentication
Most endpoints require Firebase Auth Token.
Header: `Authorization: Bearer <firebase_id_token>`

## 2. Strategies

### GET /strategies
List user's strategies.
*   **Auth**: Required
*   **Response**: `StrategySummaryDTO[]`

### POST /strategies
Create a new strategy.
*   **Auth**: Required
*   **Body**: `CreateStrategyDTO`
*   **Response**: `StrategyEntity`

### GET /strategies/:id
Get detailed strategy configuration and stats.
*   **Auth**: Optional (if public), Required (if private)
*   **Response**: `StrategyEntity`

### PUT /strategies/:id
Update a strategy.
*   **Auth**: Required (Owner only)
*   **Body**: `UpdateStrategyDTO`

### DELETE /strategies/:id
Delete a strategy.
*   **Auth**: Required (Owner only)

## 3. Backtest

### POST /backtest/run
Run a backtest simulation.
*   **Auth**: Optional (can be run by guests, but maybe rate-limited)
*   **Body**:
    ```json
    {
      "strategyConfig": { ... }, // Full StrategyConfig object
      "options": { ... } // Optional overrides (dates, initial capital)
    }
    ```
*   **Response**: `BacktestResultDTO`

#### 响应结构 (Success 200)

```json
{
  "metadata": {
    "symbol": "QQQ",
    "period": "2020-01-01 to 2023-12-31"
  },
  "performance": {
    "strategy": {
      "totalReturn": 45.2,
      "annualizedReturn": 12.5,
      "maxDrawdown": -15.3,
      "sharpeRatio": 1.8,
      "tradeStats": {
        "totalTrades": 12,
        "buyCount": 6,
        "sellCount": 6,
        "totalInvested": 50000,
        "totalProceeds": 72000
      }
    },
    "benchmark": {
      "totalReturn": 30.1,
      "annualizedReturn": 9.2,
      "maxDrawdown": -25.4,
      "sharpeRatio": 1.2,
      "tradeStats": { ... }
    },
    "dca": { ... }
  },
  "analysis": {
    "topDrawdowns": [
      {
        "rank": 1,
        "depthPercent": -34.1,
        "peakDate": "2020-02-19",
        "peakPrice": 12000.50,
        "valleyDate": "2020-03-23",
        "valleyPrice": 7908.33,
        "recoveryDate": "2020-08-10",
        "daysToRecover": 173,
        "isRecovered": true
      },
      {
        "rank": 2,
        "depthPercent": -12.5,
        "peakDate": "2022-01-03",
        "peakPrice": 15000.00,
        "valleyDate": "2022-05-20",
        "valleyPrice": 13125.00,
        "recoveryDate": null,
        "daysToRecover": 200,
        "isRecovered": false
      }
    ]
  },
  "charts": {
    "dates": ["2020-01-01", "2020-01-02", ...],
    "strategyEquity": [10000, 10100, ...],
    "benchmarkEquity": [10000, 10050, ...],
    "dcaEquity": [10000, 10020, ...],
    "underlyingPrice": [300.5, 302.1, ...],
    "vixData": [15.2, 16.1, ...]
  },
  "trades": [
    {
      "date": "2020-03-15",
      "action": "buy",
      "quantity": 10,
      "price": 280.5,
      "reason": "RSI < 30"
    }
  ]
}
```

## 4. Community

### GET /community/strategies
Get public strategies (Community Board).
*   **Params**: `sort` (recent, popular, return), `page`, `limit`
*   **Response**: List of strategies with author info.

### POST /strategies/:id/like
Toggle like on a strategy.

### POST /strategies/:id/comments
Add a comment.

### GET /strategies/:id/comments
Get comments for a strategy.

## 5. User

### POST /users/sync
Sync Firebase user to Cloudflare D1.
*   **Body**: `{ email, displayName, photoUrl }`

### GET /users/me
Get current user profile.

## 6. Notifications

### GET /notifications
Get user notifications.

### PUT /notifications/:id/read
Mark notification as read.