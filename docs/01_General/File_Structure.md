
# 项目结构文档：ETF 投资策略回测平台

**版本**: 1.0
**架构模式**: Monorepo (单体仓库)
**包管理器**: pnpm (推荐)
**构建编排**: Turborepo (可选，但推荐用于加速构建)

## 1. 目录结构概览

整个项目由一个根目录管理，核心代码分为 **`apps`** (应用程序/可部署单元) 和 **`packages`** (共享库/依赖) 两大部分。

```text
etf-strategy-platform/
├── package.json                # 根依赖与脚本 (pnpm workspaces 配置)
├── pnpm-workspace.yaml         # 定义工作区包含哪些目录
├── turbo.json                  # Turborepo 任务编排配置 (build, dev, lint)
├── .gitignore                  # Git 忽略文件
├── README.md                   # 项目说明文档
│
├── apps/                       # [应用程序层] 可独立运行和部署的项目
│   │
│   ├── backend/                # [API 服务] Cloudflare Worker (Hono 框架)
│   │   ├── src/
│   │   │   ├── db/             # D1 数据库 Schema 定义与查询语句
│   │   │   ├── endpoints/      # 路由处理函数 (Controller)
│   │   │   ├── services/       # 核心业务逻辑 (回测算法、数据获取、缓存策略)
│   │   │   ├── middleware/     # 中间件 (Firebase Auth 验证, CORS)
│   │   │   └── index.ts        # Worker 入口文件
│   │   ├── migrations/         # D1 数据库迁移文件 (.sql)
│   │   ├── wrangler.jsonc      # Cloudflare Worker 配置文件 (绑定 KV, D1)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/               # [SSR 客户端] Nuxt 3 (Vue 3 + Tailwind v4)
│       ├── assets/             # 静态资源 (CSS, Images)
│       ├── components/
│       │   ├── ui/             # shadcn-vue 基础组件 (Button, Dialog...)
│       │   └── strategy/       # 业务组件 (TriggerBuilder, ChartView...)
│       ├── composables/        # Vue 组合式函数 (API调用封装, 状态管理)
│       ├── layouts/            # 页面布局
│       ├── pages/              # 页面路由
│       ├── server/             # Nuxt Server 路由 (仅作为 BFF 层，可选)
│       ├── utils/              # 前端工具函数
│       ├── nuxt.config.ts      # Nuxt 配置 (preset: cloudflare-pages)
│       ├── package.json
│       └── tsconfig.json
│
└── packages/                   # [共享库层] 被 apps 引用的内部包
    │
    └── shared/                 # [类型定义库] 纯 TypeScript，无运行时副作用
        ├── src/
        │   ├── api-dtos.ts     # API 请求/响应接口 (Request/Response DTOs)
        │   ├── db-schema.ts    # 数据库实体接口 (User, Strategy)
        │   ├── domain.ts       # 核心业务模型 (StrategyConfig, Trigger)
        │   └── constants.ts    # 共享常量 (如默认 ETF 列表)
        ├── package.json        # name: "@etf/shared"
        ├── tsconfig.json
        └── index.ts            # 统一导出
```

---

## 2. 详细模块说明

### 2.1. `packages/shared` (共享类型库)

这是整个项目的“数字契约”。前后端必须共同遵守这里定义的类型，以实现真正的全栈类型安全。

*   **包名**: `@etf/shared`
*   **职责**: 存放接口定义、类型别名、枚举和少量无副作用的工具函数。
*   **关键文件**:
    *   `index.ts`: 导出所有模块。
    *   `api-dtos.ts`: 定义 `/backtest` 等接口的 Input/Output 结构。例如 `BacktestRequestDTO` 和 `BacktestResponseDTO`。
    *   `domain.ts`: 定义策略配置的 JSON 结构，例如 `StrategyConfig`, `Trigger`, `TriggerCondition`。
*   **引用方式**:
    *   在 Backend 中: `import { StrategyConfig } from '@etf/shared'`
    *   在 Frontend 中: `import type { StrategyConfig } from '@etf/shared'`

### 2.2. `apps/backend` (后端 API)

基于 **Cloudflare Workers**，建议使用 **Hono** 框架，因为它体积小、路由语法类似 Express，且对 TypeScript 支持极佳。

*   **技术栈**: Cloudflare Workers, Hono, Drizzle ORM (可选，用于操作 D1) 或 原生 D1 binding。
*   **核心目录**:
    *   `src/index.ts`: 初始化 Hono 应用，挂载路由，导出 `fetch` 处理函数供 Worker 运行时调用。
    *   `src/middleware/auth.ts`: 拦截请求，解析 Header 中的 Firebase JWT，验证用户身份。
    *   `src/services/backtest.ts`: **核心引擎**。包含解析策略、从 KV 读取数据、执行回测循环、计算 KPI 的逻辑。
    *   `src/services/data-provider.ts`: 封装 `yahoo-finance2` 调用和 KV 读写逻辑。
*   **配置文件 (`wrangler.jsonc`)**:
    *   定义 `kv_namespaces` 绑定 (Cache)。
    *   定义 `d1_databases` 绑定 (User/Strategy Data)。

### 2.3. `apps/frontend` (前端 SSR)

基于 **Nuxt 3**，部署到 **Cloudflare Pages**。

*   **技术栈**: Nuxt 3, Vue 3, Tailwind CSS v4, shadcn-vue, Radix Vue。
*   **核心目录**:
    *   `components/ui/`: **不要**手动修改这里的文件结构。这是通过 `npx shadcn-vue@latest add <component>` 自动生成的代码。
    *   `composables/useApi.ts`: 封装 `useFetch`，自动附加 Firebase Token，并使用 `@etf/shared` 中的泛型来推断返回值类型。
    *   `pages/design.vue`: 策略设计器的主页面。
    *   `pages/report/[id].vue`: 回测结果报告页 (支持 SSR 生成 Open Graph 图片)。
*   **Nuxt 配置**:
    ```typescript
    // nuxt.config.ts
    export default defineNuxtConfig({
      modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
      nitro: {
        preset: 'cloudflare-pages' // 关键配置
      },
      // ...
    })
    ```

---

## 3. 工作流与脚本

在根目录的 `package.json` 中定义全局脚本，通过 `pnpm` 过滤参数控制执行范围。

### 3.1. 安装依赖

```bash
pnpm install
```
此命令会安装所有 apps 和 packages 的依赖，并创建软链接。

### 3.2. 本地开发 (Dev)

我们希望同时启动前端和后端服务，以便进行联调。

```bash
# 根目录 package.json script
"dev": "turbo run dev"
```

*   **Backend**: 运行 `wrangler dev`，在本地模拟 Cloudflare 环境 (端口 8787)。
*   **Frontend**: 运行 `nuxt dev`，启动 Vite 开发服务器 (端口 3000)。
*   **代理配置**: 在 Nuxt 配置中设置 `nitro.devProxy` 或 `runtimeConfig`，将 `/api` 请求转发到 `http://localhost:8787`。

### 3.3. 部署 (Deploy)

部署分为两步，分别部署后端 API 和前端页面。

```bash
# 部署后端 Worker
pnpm --filter backend run deploy
# 实际执行: cd apps/backend && wrangler deploy

# 部署前端 Pages
pnpm --filter frontend run build
pnpm --filter frontend run deploy
# 实际执行: cd apps/frontend && nuxt build && wrangler pages deploy .output/public
```

---

## 4. 最佳实践约定

1.  **API 类型共享**: 前端在调用 API 时，**禁止**使用 `any`。必须使用 `packages/shared` 中定义的 DTO 类型。
    ```typescript
    // 前端代码示例
    import type { BacktestResponseDTO } from '@etf/shared';
    const { data } = await useApi<BacktestResponseDTO>('/backtest', { ... });
    ```

2.  **UI 组件隔离**: 所有的基础 UI 组件（按钮、输入框、对话框）都必须放在 `components/ui`。业务组件（如 `TriggerRuleRow.vue`）引用基础组件，放在 `components/strategy` 或 `components/business` 中。

3.  **环境隔离**: 使用 `.dev.vars` (后端) 和 `.env` (前端) 来区分本地开发和生产环境的环境变量（如 Firebase Config）。

4.  **数据库迁移**: D1 数据库的变更必须通过 `migrations` 文件夹中的 `.sql` 文件进行管理，禁止手动在控制台修改生产数据库结构。