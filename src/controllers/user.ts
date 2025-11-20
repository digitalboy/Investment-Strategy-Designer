// src/controllers/user.ts
import { Context } from 'hono';
import { DatabaseService } from '../lib/database';
import { UserSyncResponseDTO } from '../types';

interface Env {
	etf_strategy_db: D1Database;
	ETF_STRATEGY_DATA: KVNamespace;
	FIREBASE_PROJECT_ID: string;
}

interface Variables {
	firebaseUid: string;
	email?: string;
}

export const userController = {
	syncUser: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			// Get firebaseUid from the authentication middleware
			const firebaseUid = c.get('firebaseUid');

			if (!firebaseUid) {
				return c.json({
					error: {
						code: 'AUTH_ERROR',
						message: 'Firebase UID not found in context'
					}
				}, 401);
			}

			const dbService = new DatabaseService(c.env.etf_strategy_db);

			// Try to get existing user
			let user = await dbService.getUserByFirebaseUid(firebaseUid);

			if (user) {
				// User exists, update last login
				await dbService.updateUserLastLogin(firebaseUid);
				user = await dbService.getUserByFirebaseUid(firebaseUid);
			} else {
				// User doesn't exist, create new user
				const email = c.get('email') || `${firebaseUid}@example.com`;
				user = await dbService.createUser(firebaseUid, email);
			}

			if (!user) {
				return c.json({
					error: {
						code: 'USER_ERROR',
						message: 'Failed to sync user'
					}
				}, 500);
			}

			const response: UserSyncResponseDTO = {
				id: user.id,
				firebaseUid: user.firebase_uid,
				email: user.email,
				createdAt: user.created_at,
			};

			return c.json(response);
		} catch (error) {
			console.error('User sync error:', error);
			return c.json({
				error: {
					code: 'USER_SYNC_ERROR',
					message: 'An error occurred while syncing user'
				}
			}, 500);
		}
	}
};
