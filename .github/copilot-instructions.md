# GitHub Copilot 指令

## 项目上下文

这是一个投资策略设计器应用程序的单仓库，采用“无服务器与边缘优先”架构构建。

- **根目录**：`c:\DavidCode\Investment-Strategy-Designer`
- **应用程序**：`apps/backend`（Cloudflare Workers）、`apps/frontend`（Vue 3）

## 架构与技术栈

### 后端 (`apps/backend`)

- **运行时**：Cloudflare Workers（边缘）。
- **框架**：[Hono](https://hono.dev) 用于路由、中间件和请求处理。
- **数据库**：Cloudflare D1（SQLite）。
  - **模式**：使用封装在 `DatabaseService`（`src/lib/database.ts`）中的原始 SQL 查询。
  - **无 ORM**：除非明确要求，否则不要建议使用 Prisma 或 Drizzle。使用 `db.prepare('SQL').bind(params).run()/first()/all()`。
- **缓存**：Cloudflare KV 用于缓存外部 API 数据（例如，Yahoo Finance）。
- **认证**：Firebase Authentication（通过 `middleware/auth.ts` 中的 `jose` 进行 JWT 验证）。
- **测试**：Vitest 与 `@cloudflare/vitest-pool-workers`。

### 前端 (`apps/frontend`)

- **框架**：Vue 3（组合式 API，`<script setup lang="ts">`）。
- **构建**：Vite。
- **样式**：Tailwind CSS v4。
- **UI 组件**：[shadcn-vue](https://www.shadcn-vue.com/)（基于 `reka-ui`）。
  - 组件位于 `src/components/ui`。
  - 图标：`lucide-vue-next`。
- **状态**：Pinia（`src/stores`）。
- **API 客户端**：自定义 fetch/axios 包装器，与 `/api/v1` 交互。

## 编码约定

### 通用

- **TypeScript**：严格类型化。为所有数据结构定义接口（例如，`UserEntity`、`StrategyConfig`）。
- **单仓库**：注意 `apps/` 结构。运行命令时，路径应相对于特定应用程序根目录。

### 后端开发

- **控制器**：将逻辑保留在 `src/controllers` 中。使用 `c.req.json()` 解析请求体，使用 `c.json()` 返回响应。
- **错误处理**：将异步操作包装在 `try/catch` 中。返回结构化的错误响应。
- **环境**：通过 `c.env` 访问绑定（D1、KV、Vars）。

### 前端开发

- **组件**：使用 `<script setup lang="ts">`。
- **Tailwind**：使用实用类进行样式设置。除非用于复杂动画或特定覆盖，否则避免使用 `<style>` 块。
- **可重用性**：优先在 `src/components` 中创建小型、可重用的组件。

## 关键工作流

### 后端

- **启动开发服务器**：`npm run dev`（包装 `wrangler dev`）。
- **运行测试**：`npm run test`（Vitest）。
- **部署**：`npm run deploy`。
- **迁移**：SQL 文件位于 `migrations/`。通过 `wrangler d1 migrations` 管理。

### 前端

- **启动开发服务器**：`npm run dev`。
- **构建**：`npm run build`。

## 关键文件与目录

- **后端入口**：`apps/backend/src/index.ts`（路由与应用程序设置）
- **数据库逻辑**：`apps/backend/src/lib/database.ts`（SQL 查询）
- **前端应用程序**：`apps/frontend/src/App.vue`
- **前端存储**：`apps/frontend/src/stores/`