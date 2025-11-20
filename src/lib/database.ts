// src/lib/database.ts
import { D1Database } from '@cloudflare/workers-types';
import { UserEntity, StrategyEntity, StrategyConfig, CommentEntity } from '../types';

export class DatabaseService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // 用户相关操作
  async createUser(firebaseUid: string, email: string): Promise<UserEntity> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO users (id, firebase_uid, email, created_at)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `;

    const user = await this.db
      .prepare(query)
      .bind(id, firebaseUid, email, now)
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

  async updateUserLastLogin(firebaseUid: string): Promise<void> {
    const now = new Date().toISOString();
    const query = 'UPDATE users SET last_login_at = ? WHERE firebase_uid = ?';

    await this.db.prepare(query).bind(now, firebaseUid).run();
  }

  // 策略相关操作
  async createStrategy(userId: string, name: string, description: string | undefined, config: StrategyConfig, isPublic: boolean = false): Promise<StrategyEntity> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const configStr = JSON.stringify(config);

    const query = `
      INSERT INTO strategies (id, user_id, name, description, config, is_public, view_count, like_count, clone_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      RETURNING *
    `;

    const strategy = await this.db
      .prepare(query)
      .bind(id, userId, name, description, configStr, isPublic ? 1 : 0, now, now)
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

  async getStrategiesByUserId(userId: string): Promise<StrategyEntity[]> {
    const query = 'SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC';

    const strategies = await this.db
      .prepare(query)
      .bind(userId)
      .all<StrategyEntity>();

    return strategies.results;
  }

  async updateStrategy(id: string, userId: string, name: string, description: string | undefined, config: StrategyConfig, isPublic: boolean): Promise<StrategyEntity | null> {
    const now = new Date().toISOString();
    const configStr = JSON.stringify(config);

    const query = `
      UPDATE strategies
      SET name = ?, description = ?, config = ?, is_public = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
      RETURNING *
    `;

    const strategy = await this.db
      .prepare(query)
      .bind(name, description, configStr, isPublic ? 1 : 0, now, id, userId)
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
  async getPublicStrategies(sortBy: 'recent' | 'popular' | 'return' = 'recent', limit: number = 20, offset: number = 0): Promise<StrategyEntity[]> {
    let orderBy = 'created_at DESC';
    if (sortBy === 'popular') orderBy = 'like_count DESC, view_count DESC';
    // 'return' sorting would require parsing JSON or storing return rate in a column. For now, fallback to recent.

    const query = `SELECT * FROM strategies WHERE is_public = 1 ORDER BY ${orderBy} LIMIT ? OFFSET ?`;

    const strategies = await this.db
      .prepare(query)
      .bind(limit, offset)
      .all<StrategyEntity>();

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

  async addComment(userId: string, strategyId: string, content: string): Promise<CommentEntity> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO comments (id, strategy_id, user_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `;

    const comment = await this.db
      .prepare(query)
      .bind(id, strategyId, userId, content, now)
      .first<CommentEntity | null>();

    if (!comment) throw new Error('Failed to add comment');
    return comment;
  }

  async getComments(strategyId: string): Promise<CommentEntity[]> {
    const query = 'SELECT * FROM comments WHERE strategy_id = ? ORDER BY created_at DESC';
    const comments = await this.db.prepare(query).bind(strategyId).all<CommentEntity>();
    return comments.results;
  }
}
