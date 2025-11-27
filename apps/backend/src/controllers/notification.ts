import { Context } from 'hono';
import { DatabaseService } from '../lib/database';
import { NotificationDTO } from '../types';

interface Env {
	etf_strategy_db: D1Database;
	ETF_STRATEGY_DATA: KVNamespace;
	FIREBASE_PROJECT_ID: string;
}

interface Variables {
	firebaseUid: string;
	email?: string;
	displayName?: string;
	photoUrl?: string;
}

export const notificationController = {
	getNotifications: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const firebaseUid = c.get('firebaseUid');
			if (!firebaseUid) {
				return c.json({ error: { code: 'AUTH_ERROR', message: 'Authentication required' } }, 401);
			}

			const dbService = new DatabaseService(c.env.etf_strategy_db);
			const user = await dbService.getUserByFirebaseUid(firebaseUid);
			if (!user) {
				return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
			}

			const page = parseInt(c.req.query('page') || '1', 10);
			const limit = parseInt(c.req.query('limit') || '20', 10);
			const offset = (page - 1) * limit;

			const [notifications, unreadCount] = await Promise.all([
				dbService.getUserNotifications(user.id, limit, offset),
				dbService.getUnreadNotificationCount(user.id)
			]);

			const items: NotificationDTO[] = notifications.map(n => {
				let metadata = undefined;
				if (n.metadata) {
					try {
						metadata = JSON.parse(n.metadata);
					} catch (e) {
						// ignore
					}
				}
				return {
					id: n.id,
					title: n.title,
					content: n.content,
					type: n.type as 'signal' | 'system',
					read: !!n.is_read,
					timestamp: n.created_at,
					metadata
				};
			});

			return c.json({
				items,
				unreadCount,
				hasMore: items.length === limit
			});
		} catch (error) {
			console.error('Get notifications error:', error);
			return c.json({ error: { code: 'GET_NOTIFICATIONS_ERROR', message: 'Failed to fetch notifications' } }, 500);
		}
	},

	markAsRead: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const { id } = c.req.param();
			const firebaseUid = c.get('firebaseUid');
			if (!firebaseUid) {
				return c.json({ error: { code: 'AUTH_ERROR', message: 'Authentication required' } }, 401);
			}

			const dbService = new DatabaseService(c.env.etf_strategy_db);
			const user = await dbService.getUserByFirebaseUid(firebaseUid);
			if (!user) {
				return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
			}

			await dbService.markNotificationAsRead(user.id, id);
			return c.json({ success: true });
		} catch (error) {
			console.error('Mark notification read error:', error);
			return c.json({ error: { code: 'MARK_READ_ERROR', message: 'Failed to mark notification as read' } }, 500);
		}
	},

	markAllRead: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const firebaseUid = c.get('firebaseUid');
			if (!firebaseUid) {
				return c.json({ error: { code: 'AUTH_ERROR', message: 'Authentication required' } }, 401);
			}

			const dbService = new DatabaseService(c.env.etf_strategy_db);
			const user = await dbService.getUserByFirebaseUid(firebaseUid);
			if (!user) {
				return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
			}

			await dbService.markAllNotificationsAsRead(user.id);
			return c.json({ success: true });
		} catch (error) {
			console.error('Mark all notifications read error:', error);
			return c.json({ error: { code: 'MARK_ALL_READ_ERROR', message: 'Failed to mark all notifications as read' } }, 500);
		}
	}
};
