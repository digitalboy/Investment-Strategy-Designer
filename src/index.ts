import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { backtestController, userController, strategyController } from './controllers';

// 定义环境变量接口
interface Env {
	etf_strategy_db: D1Database;
	ETF_STRATEGY_DATA: KVNamespace;
	FIREBASE_PROJECT_ID: string;
}

// Define Variables interface for context
interface Variables {
	firebaseUid: string;
	email?: string;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// 添加中间件
app.use('*', logger());
app.use(
	'*',
	cors({
		origin: (origin) => origin || '*',
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	})
);

// API版本路由前缀
const api = app.basePath('/api/v1');

// 公开端点
api.post('/backtest', backtestController.runBacktest);
// Public strategy endpoints (some might need auth for specific actions, handled in controller)
api.get('/strategies/:id/comments', strategyController.getComments);

// 需要认证的端点
api.post('/users/sync', authMiddleware, userController.syncUser);

// Strategy management
api.post('/strategies', authMiddleware, strategyController.createStrategy);
api.get('/strategies', optionalAuthMiddleware, strategyController.getStrategies); // Handles both 'mine' and 'public'
api.get('/strategies/:id', optionalAuthMiddleware, strategyController.getStrategy); // Handles public view logic too
api.put('/strategies/:id', authMiddleware, strategyController.updateStrategy);
api.delete('/strategies/:id', authMiddleware, strategyController.deleteStrategy);

// Community features
api.post('/strategies/:id/like', authMiddleware, strategyController.toggleLike);
api.post('/strategies/:id/comments', authMiddleware, strategyController.addComment);

// 根路径返回项目信息
app.get('/', (c) => {
	return c.text('ETF Investment Strategy Designer Backend API');
});

export default app;
