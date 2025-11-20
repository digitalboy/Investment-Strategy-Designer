// src/controllers/strategy.ts
import { Context } from 'hono';
import { DatabaseService } from '../lib/database';
import { StrategyEntity, StrategyConfig, StrategySummaryDTO } from '../types';

interface Env {
	etf_strategy_db: D1Database;
	ETF_STRATEGY_DATA: KVNamespace;
	FIREBASE_PROJECT_ID: string;
}

interface Variables {
	firebaseUid: string;
	email?: string;
}

export const strategyController = {
	createStrategy: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const { name, description, config, isPublic } = await c.req.json();

			// Basic validation
			if (!name || typeof name !== 'string' || name.length < 1 || name.length > 255) {
				return c.json({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Name is required and must be between 1 and 255 characters'
					}
				}, 400);
			}

			if (description && typeof description !== 'string') {
				return c.json({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Description must be a string if provided'
					}
				}, 400);
			}

			if (!config) {
				return c.json({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Config is required'
					}
				}, 400);
			}

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

			// Get user by firebase UID to get the internal user ID
			let user = await dbService.getUserByFirebaseUid(firebaseUid);

			// If user not found, create it automatically (Lazy creation)
			if (!user) {
				const email = c.get('email') || `${firebaseUid}@placeholder.com`;
				try {
					user = await dbService.createUser(firebaseUid, email);
				} catch (createError) {
					console.error('Failed to auto-create user:', createError);
					return c.json({
						error: {
							code: 'USER_CREATION_FAILED',
							message: 'Failed to create user profile'
						}
					}, 500);
				}
			}

			// Create the strategy
			const strategy = await dbService.createStrategy(user.id, name, description, config, !!isPublic);

			return c.json({
				id: strategy.id,
				name: strategy.name,
				createdAt: strategy.created_at
			}, 201);
		} catch (error) {
			console.error('Create strategy error:', error);
			return c.json({
				error: {
					code: 'CREATE_STRATEGY_ERROR',
					message: 'An error occurred while creating the strategy'
				}
			}, 500);
		}
	},

	getStrategies: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const scope = c.req.query('scope') || 'mine'; // 'mine' | 'public'
			const sortBy = c.req.query('sort') as 'recent' | 'popular' | 'return' || 'recent';

			const dbService = new DatabaseService(c.env.etf_strategy_db);
			let strategies: StrategyEntity[] = [];

			if (scope === 'public') {
				strategies = await dbService.getPublicStrategies(sortBy);
			} else {
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

				// Get user by firebase UID to get the internal user ID
				const user = await dbService.getUserByFirebaseUid(firebaseUid);
				if (!user) {
					return c.json({
						error: {
							code: 'USER_NOT_FOUND',
							message: 'User not found'
						}
					}, 404);
				}

				// Get all strategies for the user
				strategies = await dbService.getStrategiesByUserId(user.id);
			}

			// Format response as StrategySummaryDTO
			const summaries: StrategySummaryDTO[] = strategies.map(strategy => ({
				id: strategy.id,
				name: strategy.name,
				description: strategy.description,
				updatedAt: strategy.updated_at,
				isPublic: !!strategy.is_public,
				stats: {
					views: strategy.view_count,
					likes: strategy.like_count,
					clones: strategy.clone_count
				}
			}));

			return c.json(summaries);
		} catch (error) {
			console.error('Get strategies error:', error);
			return c.json({
				error: {
					code: 'GET_STRATEGIES_ERROR',
					message: 'An error occurred while fetching strategies'
				}
			}, 500);
		}
	},

	getStrategy: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const { id } = c.req.param();

			// Get firebaseUid from the authentication middleware
			const firebaseUid = c.get('firebaseUid');
			const dbService = new DatabaseService(c.env.etf_strategy_db);

			// Get the specific strategy
			const strategy = await dbService.getStrategyById(id);

			if (!strategy) {
				return c.json({
					error: {
						code: 'STRATEGY_NOT_FOUND',
						message: 'Strategy not found'
					}
				}, 404);
			}

			// Check permissions
			let isOwner = false;
			if (firebaseUid) {
				const user = await dbService.getUserByFirebaseUid(firebaseUid);
				if (user && user.id === strategy.user_id) {
					isOwner = true;
				}
			}

			if (!isOwner && !strategy.is_public) {
				return c.json({
					error: {
						code: 'FORBIDDEN',
						message: 'You do not have permission to view this strategy'
					}
				}, 403);
			}

			// Increment view count if public and not owner
			if (!isOwner && strategy.is_public) {
				c.executionCtx.waitUntil(dbService.incrementStrategyCounter(id, 'view_count'));
			}

			// Parse the config from JSON string
			const config: StrategyConfig = JSON.parse(strategy.config);

			return c.json({
				id: strategy.id,
				name: strategy.name,
				description: strategy.description,
				config,
				isPublic: !!strategy.is_public,
				stats: {
					views: strategy.view_count,
					likes: strategy.like_count,
					clones: strategy.clone_count
				},
				createdAt: strategy.created_at,
				updatedAt: strategy.updated_at,
				isOwner
			});
		} catch (error) {
			console.error('Get strategy error:', error);
			return c.json({
				error: {
					code: 'GET_STRATEGY_ERROR',
					message: 'An error occurred while fetching the strategy'
				}
			}, 500);
		}
	},

	updateStrategy: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const { id } = c.req.param();
			const { name, description, config, isPublic } = await c.req.json();

			// Basic validation
			if (name && (typeof name !== 'string' || name.length < 1 || name.length > 255)) {
				return c.json({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Name must be between 1 and 255 characters if provided'
					}
				}, 400);
			}

			if (description && typeof description !== 'string') {
				return c.json({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Description must be a string if provided'
					}
				}, 400);
			}

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

			// Get user by firebase UID to get the internal user ID
			const user = await dbService.getUserByFirebaseUid(firebaseUid);
			if (!user) {
				return c.json({
					error: {
						code: 'USER_NOT_FOUND',
						message: 'User not found'
					}
				}, 404);
			}

			// Update the strategy
			const strategy = await dbService.updateStrategy(id, user.id,
				name || '', description, config as StrategyConfig, !!isPublic);

			if (!strategy) {
				return c.json({
					error: {
						code: 'STRATEGY_NOT_FOUND',
						message: 'Strategy not found or not owned by user'
					}
				}, 404);
			}

			return c.json({
				id: strategy.id,
				name: strategy.name,
				updatedAt: strategy.updated_at
			});
		} catch (error) {
			console.error('Update strategy error:', error);
			return c.json({
				error: {
					code: 'UPDATE_STRATEGY_ERROR',
					message: 'An error occurred while updating the strategy'
				}
			}, 500);
		}
	},

	deleteStrategy: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const { id } = c.req.param();

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

			// Get user by firebase UID to get the internal user ID
			const user = await dbService.getUserByFirebaseUid(firebaseUid);
			if (!user) {
				return c.json({
					error: {
						code: 'USER_NOT_FOUND',
						message: 'User not found'
					}
				}, 404);
			}

			// Delete the strategy
			const success = await dbService.deleteStrategy(id, user.id);

			if (!success) {
				return c.json({
					error: {
						code: 'STRATEGY_NOT_FOUND',
						message: 'Strategy not found or not owned by user'
					}
				}, 404);
			}

			return c.body(null, 204); // No content response
		} catch (error) {
			console.error('Delete strategy error:', error);
			return c.json({
				error: {
					code: 'DELETE_STRATEGY_ERROR',
					message: 'An error occurred while deleting the strategy'
				}
			}, 500);
		}
	},

	toggleLike: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
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

			const result = await dbService.toggleLike(user.id, id);
			return c.json(result);
		} catch (error) {
			console.error('Toggle like error:', error);
			return c.json({ error: { code: 'TOGGLE_LIKE_ERROR', message: 'Failed to toggle like' } }, 500);
		}
	},

	getComments: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const { id } = c.req.param();
			const dbService = new DatabaseService(c.env.etf_strategy_db);

			const comments = await dbService.getComments(id);
			return c.json(comments);
		} catch (error) {
			console.error('Get comments error:', error);
			return c.json({ error: { code: 'GET_COMMENTS_ERROR', message: 'Failed to fetch comments' } }, 500);
		}
	},

	addComment: async (c: Context<{ Bindings: Env; Variables: Variables }>) => {
		try {
			const { id } = c.req.param();
			const { content } = await c.req.json();
			const firebaseUid = c.get('firebaseUid');

			if (!firebaseUid) {
				return c.json({ error: { code: 'AUTH_ERROR', message: 'Authentication required' } }, 401);
			}

			if (!content || typeof content !== 'string' || content.trim().length === 0) {
				return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Comment content is required' } }, 400);
			}

			const dbService = new DatabaseService(c.env.etf_strategy_db);
			const user = await dbService.getUserByFirebaseUid(firebaseUid);

			if (!user) {
				return c.json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
			}

			const comment = await dbService.addComment(user.id, id, content);
			return c.json(comment, 201);
		} catch (error) {
			console.error('Add comment error:', error);
			return c.json({ error: { code: 'ADD_COMMENT_ERROR', message: 'Failed to add comment' } }, 500);
		}
	}
};
