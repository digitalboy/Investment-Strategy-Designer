# Yahoo 数据抓取与缓存策略

## 1. 背景与目标

- 减少对 Yahoo Finance API 的直接访问次数，防止限流并提高响应速度。
- 支撑多用户同时请求同一 ETF 历史数据时的稳定性，并能快速返回大跨度区间。
- 允许前端按需获取任意时间切片，而无需重复触发外部抓取。

## 2. 数据抓取流程概览

1. 后端收到回测请求后，读取单一 KV key（`MARKET:${symbol}`）中的全量数据记录。
2. 如果缓存不存在，则阻塞一次，直接从 Yahoo 抓取全量历史并写入 KV。
3. 如果缓存存在但已过 `nextFetchTime`，本次请求仍然返回旧数据，同时通过 `waitUntil` 在后台触发增量抓取（SWR 思路）。
4. Yahoo 抓到的新数据与旧数组合并、去重后整体写回 KV，并更新 `lastUpdated`、`lastTradeDate`、`nextFetchTime`。
5. 记录每次抓取的耗时与结果，便于监控哪些 symbol 频繁超时或缺数据。

## 3. 阶段一（MVP）缓存策略

- **单 Key 全量存储**：每个 ETF 对应一个 JSON 对象，包含 `symbol`、`lastUpdated`、`lastTradeDate`、`nextFetchTime` 以及 `data` 数组。20 年日线（<200KB）完全在 KV 的 25MB 限制内。
- **切片在内存完成**：读取 KV 后在 Worker 内按 `start/end` 裁剪数组再返回，避免多次 IO 与拼接逻辑。
- **可选热点列表**：新增 `HOT_ETFS` key，供 Cron 任务遍历并预热热门标的。

示例结构：

```json
{
  "symbol": "QQQ",
  "lastUpdated": 1715000000000,
  "lastTradeDate": "2024-05-06",
  "nextFetchTime": 1715003600000,
  "data": [
    /* 全量 OHLCV 数组 */
  ]
}
```

## 4. 软过期与异步刷新

- **SWR (Stale-While-Revalidate)**：命中缓存即返回，哪怕超过 `nextFetchTime`。用户可立即得到结果，后端利用 `waitUntil` 在后台刷新。
- **冷却时间**：`nextFetchTime` 按场景设置（如 1 小时或下一交易日开盘），期间不重复抓取。
- **失败容忍**：若后台刷新失败，仅记录日志，不影响前端已有数据；下次请求再尝试。
- **Cron 预热**：在美股收盘后运行 Cron，遍历 `HOT_ETFS`，强制刷新一次，确保早间访问即获得最新行情。

## 5. 增量更新（读取-追加-写入）

1. 读取 KV 里的全量数组，记下 `lastTradeDate`。
2. 调用 Yahoo API，仅请求 `lastTradeDate` 之后至今的区间。
3. 使用日期去重策略把增量数据 append 到旧数组尾部，并更新元数据。
4. 将新数组整体写回 KV，可设置 `expirationTtl`（如 7 天，用户访问自动续期）。
5. 若 `lastUpdated` 超过阈值（例如 7-30 天），切换为全量抓取并覆盖，以修正拆股/分红导致的历史价格漂移。

## 6. 伪代码（MVP 流程）

```ts
export async function getEtfData(
  symbol: string,
  start: string,
  end: string,
  ctx: ExecutionContext
) {
  const key = `MARKET:${symbol}`;
  let record = await KV.get(key, "json");
  const now = Date.now();
  const needsFetch = !record || now > record.nextFetchTime;

  if (!record) {
    record = await fetchFullHistory(symbol);
    await KV.put(key, JSON.stringify(record));
  } else if (needsFetch) {
    ctx.waitUntil(refreshIncremental(key, record));
  }

  return slice(record.data, start, end);
}
```

`refreshIncremental` 内部执行“读取-追加-写入”并更新 `nextFetchTime`。

## 7. 边界与异常处理

- **新 ETF 代码**：
  - 先做格式验证；缓存未命中时返回“数据同步中”的响应，并异步抓取。
  - 抓取成功写入缓存；失败则写入错误标记及过期时间，避免短期内重复调用。
- **日期越界/未来日期**：请求区间超过今日或起止反转时直接截断或返回校验错误。
- **第二天/延迟行情**：增量刷新任务在开盘后多次尝试拉取；如 Yahoo 当日仍无数据，则沿用上一有效收盘价，并标记 `isSynthetic` 供前端展示提示。
- **数据缺失/停牌**：对缺值做平滑处理或跳过，记录日志以便排查。

## 8. 前后端协作要点

- 后端响应中附带缓存覆盖范围（`availableFrom`, `availableTo`, `lastUpdated`），前端可据此提示用户实际可用区间。
- 前端若请求超出范围，可先展示已有区间并提示“后台正在补齐”，稍后轮询或允许用户手动刷新。
- 对回测引擎而言，接口保持 `StrategyConfig` 不变，由后端负责数据裁剪和排序，确保输入稳定。

## 9. 阶段二：扩展规划（可选）

当前方案聚焦于单 key + SWR 的 MVP。后续若数据体量或功能复杂度增加，可逐步引入：

1. **多层缓存 / 分片**：当单 key 接近 KV 限制或需要不同分辨率（如周线）时，再拆分 `symbol:year` 等结构。
2. **精细化热度 key**：为“近 1 年”“近 3 年”生成派生 key，加速高频区间的响应。
3. **分布式锁或 Durable Object**：在 Yahoo 限流成为瓶颈时，再引入更严格的并发控制。
4. **二级存储**：使用 R2 / Durable Object 存放 tick 级或更长历史，KV 仅保留热点。

## 10. 后续工作

1. 在 `CacheService` 中实现单 key JSON 结构与 SWR 刷新逻辑。
2. 编写 Yahoo 增量抓取与数组合并的工具函数，确保去重与日期排序。
3. 建立基础监控（抓取次数、失败率、lastUpdated），为 Cron 任务提供可视化支持。
4. 规划 Cron 触发的 `HOT_ETFS` 列表与刷新节奏。

## 11. 实施注意事项（Technical Tips）

1. **ExecutionContext 传递**：在 Hono/Workers 中通过 `c.executionCtx` 传入服务层，内部使用 `ctx.waitUntil(...)`，避免旧式 `event.waitUntil` 带来的兼容问题。
2. **历史数据复权**：定期执行全量覆盖，确保拆股/分红后的历史价格被纠正；否则回测曲线会出现不合理断层。
3. **刷新失败托底**：`refreshIncremental` 捕获 Yahoo API 异常时不要写入空数据，保留旧缓存并记日志；旧数据优于无数据。

该方案以“存全量 + 软过期刷新”为基准，快速上线，同时保留未来扩展空间。
