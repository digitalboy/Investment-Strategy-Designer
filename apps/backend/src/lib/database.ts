// src/lib/database.ts
import { D1Database } from '@cloudflare/workers-types';
import { UserEntity, StrategyEntity, StrategyConfig, CommentEntity, NotificationEntity } from '../types';

export class DatabaseService {
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
	}

	// 用户相关操作
	async createUser(firebaseUid: string, email: string, displayName?: string, photoUrl?: string): Promise<UserEntity> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		const query = `
      INSERT INTO users (id, firebase_uid, email, display_name, photo_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

		const user = await this.db
			.prepare(query)
			.bind(id, firebaseUid, email, displayName || null, photoUrl || null, now)
			.first<UserEntity | null>();

		if (!user) {
			throw new Error('Failed to create user');
		}

		return user;
	}

	async getUserByFirebaseUid(firebaseUid: string): Promise<UserEntity | null> {
		const query = 'SELECT * FROM users WHERE firebase_uid = ?';

		const user = await this.db
			.prepare(query)
			.bind(firebaseUid)
			.first<UserEntity | null>();

		return user;
	}

	async updateUser(firebaseUid: string, displayName?: string, photoUrl?: string): Promise<void> {
		const now = new Date().toISOString();
		const query = 'UPDATE users SET last_login_at = ?, display_name = ?, photo_url = ? WHERE firebase_uid = ?';

		await this.db.prepare(query).bind(now, displayName || null, photoUrl || null, firebaseUid).run();
	}

	// 策略相关操作
	async createStrategy(userId: string, name: string, description: string | undefined, config: StrategyConfig, isPublic: boolean = false, notificationsEnabled: boolean = false, returnRate?: number, maxDrawdown?: number, tags?: string[]): Promise<StrategyEntity> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const configStr = JSON.stringify(config);
		const tagsStr = tags ? JSON.stringify(tags) : null;

		const query = `
      INSERT INTO strategies (id, user_id, name, description, config, is_public, notifications_enabled, view_count, like_count, clone_count, comment_count, return_rate, max_drawdown, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?)
      RETURNING *
    `;

		const strategy = await this.db
			.prepare(query)
			.bind(id, userId, name, description, configStr, isPublic ? 1 : 0, notificationsEnabled ? 1 : 0, returnRate || null, maxDrawdown || null, tagsStr, now, now)
			.first<StrategyEntity | null>();

		if (!strategy) {
			throw new Error('Failed to create strategy');
		}

		return strategy;
	}

	async getStrategyById(id: string): Promise<StrategyEntity | null> {
		// 允许获取任意策略，Controller 层负责权限判断 (是否是 owner 或 public)
		const query = 'SELECT * FROM strategies WHERE id = ?';

		const strategy = await this.db
			.prepare(query)
			.bind(id)
			.first<StrategyEntity | null>();

		return strategy;
	}

	async getStrategiesByUserId(userId: string): Promise<(StrategyEntity & { author_email: string; author_name?: string; author_photo?: string })[]> {
		const query = `
      SELECT s.*, u.email as author_email, u.display_name as author_name, u.photo_url as author_photo
      FROM strategies s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `;

		const strategies = await this.db
			.prepare(query)
			.bind(userId)
			.all<StrategyEntity & { author_email: string; author_name?: string; author_photo?: string }>();

		return strategies.results;
	}

	async updateStrategy(id: string, userId: string, name: string, description: string | undefined, config: StrategyConfig, isPublic: boolean, notificationsEnabled: boolean, returnRate?: number, maxDrawdown?: number, tags?: string[]): Promise<StrategyEntity | null> {
		const now = new Date().toISOString();
		const configStr = JSON.stringify(config);
		const tagsStr = tags ? JSON.stringify(tags) : null;

		const query = `
      UPDATE strategies
      SET name = ?, description = ?, config = ?, is_public = ?, notifications_enabled = ?, return_rate = ?, max_drawdown = ?, tags = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
      RETURNING *
    `;

		const strategy = await this.db
			.prepare(query)
			.bind(name, description, configStr, isPublic ? 1 : 0, notificationsEnabled ? 1 : 0, returnRate || null, maxDrawdown || null, tagsStr, now, id, userId)
			.first<StrategyEntity | null>();

		return strategy;
	}

	async deleteStrategy(id: string, userId: string): Promise<boolean> {
		const query = 'DELETE FROM strategies WHERE id = ? AND user_id = ?';

		const result = await this.db
			.prepare(query)
			.bind(id, userId)
			.run();

		return result.success;
	}

	// 社区功能
	async getPublicStrategies(sortBy: 'recent' | 'popular' | 'return' = 'recent', limit: number = 20, offset: number = 0): Promise<(StrategyEntity & { author_email: string; author_name?: string; author_photo?: string })[]> {
		let orderBy = 's.created_at DESC';
		if (sortBy === 'popular') orderBy = 's.like_count DESC, s.view_count DESC';
		if (sortBy === 'return') orderBy = 's.return_rate DESC NULLS LAST';

		const query = `
      SELECT s.*, u.email as author_email, u.display_name as author_name, u.photo_url as author_photo
      FROM strategies s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.is_public = 1
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

		const strategies = await this.db
			.prepare(query)
			.bind(limit, offset)
			.all<StrategyEntity & { author_email: string; author_name?: string; author_photo?: string }>();

		return strategies.results;
	}

	async incrementStrategyCounter(id: string, counter: 'view_count' | 'clone_count'): Promise<void> {
		const query = `UPDATE strategies SET ${counter} = ${counter} + 1 WHERE id = ?`;
		await this.db.prepare(query).bind(id).run();
	}

	async toggleLike(userId: string, strategyId: string): Promise<{ liked: boolean; count: number }> {
		// Check if liked
		const checkQuery = 'SELECT 1 FROM likes WHERE user_id = ? AND strategy_id = ?';
		const existing = await this.db.prepare(checkQuery).bind(userId, strategyId).first();

		if (existing) {
			// Unlike
			await this.db.batch([
				this.db.prepare('DELETE FROM likes WHERE user_id = ? AND strategy_id = ?').bind(userId, strategyId),
				this.db.prepare('UPDATE strategies SET like_count = like_count - 1 WHERE id = ?').bind(strategyId)
			]);
			const count = await this.db.prepare('SELECT like_count FROM strategies WHERE id = ?').bind(strategyId).first<number>('like_count');
			return { liked: false, count: count || 0 };
		} else {
			// Like
			const now = new Date().toISOString();
			await this.db.batch([
				this.db.prepare('INSERT INTO likes (user_id, strategy_id, created_at) VALUES (?, ?, ?)').bind(userId, strategyId, now),
				this.db.prepare('UPDATE strategies SET like_count = like_count + 1 WHERE id = ?').bind(strategyId)
			]);
			const count = await this.db.prepare('SELECT like_count FROM strategies WHERE id = ?').bind(strategyId).first<number>('like_count');
			return { liked: true, count: count || 0 };
		}
	}

	async addComment(userId: string, strategyId: string, content: string, parentId?: string): Promise<CommentEntity & { user_email: string; user_name?: string; user_photo?: string }> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		// 使用批量操作：插入评论并增加计数
		await this.db.batch([
			this.db.prepare(`
        INSERT INTO comments (id, strategy_id, parent_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, strategyId, parentId || null, userId, content, now),
			this.db.prepare('UPDATE strategies SET comment_count = comment_count + 1 WHERE id = ?').bind(strategyId)
		]);

		// 获取刚插入的评论 (包含用户信息)
		const query = `
      SELECT c.*, u.email as user_email, u.display_name as user_name, u.photo_url as user_photo
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `;

		const comment = await this.db
			.prepare(query)
			.bind(id)
			.first<CommentEntity & { user_email: string; user_name?: string; user_photo?: string } | null>();

		if (!comment) throw new Error('Failed to add comment');
		return comment;
	}

	async getComments(strategyId: string, page: number = 1, limit: number = 20): Promise<(CommentEntity & { user_email: string; user_name?: string; user_photo?: string })[]> {
		const offset = (page - 1) * limit;

		const query = `
      WITH RECURSIVE 
      paginated_roots AS (
        SELECT id
        FROM comments
        WHERE strategy_id = ? AND parent_id IS NULL
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      ),
      comment_tree AS (
        -- Base case: Select full details of paginated roots
        SELECT c.id, c.strategy_id, c.parent_id, c.user_id, c.content, c.created_at
        FROM comments c
        INNER JOIN paginated_roots pr ON c.id = pr.id

        UNION ALL

        -- Recursive step: Select children of selected nodes
        SELECT c.id, c.strategy_id, c.parent_id, c.user_id, c.content, c.created_at
        FROM comments c
        INNER JOIN comment_tree ct ON c.parent_id = ct.id
      )
      SELECT tc.*, u.email as user_email, u.display_name as user_name, u.photo_url as user_photo
      FROM comment_tree tc
      LEFT JOIN users u ON tc.user_id = u.id
      ORDER BY tc.created_at DESC
    `;

		const comments = await this.db
			.prepare(query)
			.bind(strategyId, limit, offset)
			.all<CommentEntity & { user_email: string; user_name?: string; user_photo?: string }>();

		return comments.results;
	}

	// 监控与预警相关操作
	async getMonitoredStrategies(): Promise<(StrategyEntity & { author_email: string; author_name?: string })[]> {
		// 获取开启了通知的策略，同时关联用户信息以便发送邮件
		const query = `
			SELECT s.*, u.email as author_email, u.display_name as author_name
			FROM strategies s
			LEFT JOIN users u ON s.user_id = u.id
			WHERE s.notifications_enabled = 1
		`;
		const result = await this.db.prepare(query).all<StrategyEntity & { author_email: string; author_name?: string }>();
		return result.results;
	}

	async getStrategyState(strategyId: string): Promise<Record<string, string> | null> {
		const query = 'SELECT last_execution_state FROM strategy_states WHERE strategy_id = ?';
		const result = await this.db.prepare(query).bind(strategyId).first<{ last_execution_state: string } | null>();
		
		if (result && result.last_execution_state) {
			try {
				return JSON.parse(result.last_execution_state);
			} catch (e) {
				console.error(`Failed to parse strategy state for ${strategyId}`, e);
				return null;
			}
		}
		return null;
	}

	async saveStrategyState(strategyId: string, state: Record<string, string>): Promise<void> {
		const now = new Date().toISOString();
		const stateStr = JSON.stringify(state);
		
		const query = `
			INSERT INTO strategy_states (strategy_id, last_execution_state, updated_at)
			VALUES (?, ?, ?)
			ON CONFLICT(strategy_id) DO UPDATE SET
				last_execution_state = excluded.last_execution_state,
				updated_at = excluded.updated_at
		`;
		
		await this.db.prepare(query).bind(strategyId, stateStr, now).run();
	}

	// 通知相关操作
	async createNotification(userId: string, title: string, content: string, type: 'signal' | 'system' = 'signal', metadata?: Record<string, any>): Promise<void> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const metadataStr = metadata ? JSON.stringify(metadata) : null;

		const query = `
			INSERT INTO notifications (id, user_id, type, title, content, is_read, metadata, created_at)
			VALUES (?, ?, ?, ?, ?, 0, ?, ?)
		`;

		await this.db.prepare(query).bind(id, userId, type, title, content, metadataStr, now).run();
	}

	async getUserNotifications(userId: string, limit: number = 20, offset: number = 0): Promise<NotificationEntity[]> {
		const query = `
			SELECT * FROM notifications
			WHERE user_id = ?
			ORDER BY created_at DESC
			LIMIT ? OFFSET ?
		`;
		const result = await this.db.prepare(query).bind(userId, limit, offset).all<NotificationEntity>();
		return result.results;
	}

	async getUnreadNotificationCount(userId: string): Promise<number> {
		const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0';
		const result = await this.db.prepare(query).bind(userId).first<{ count: number }>();
		return result?.count || 0;
	}

	async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
		const query = 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?';
		await this.db.prepare(query).bind(notificationId, userId).run();
	}

	async markAllNotificationsAsRead(userId: string): Promise<void> {
		const query = 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0';
		await this.db.prepare(query).bind(userId).run();
	}
}
