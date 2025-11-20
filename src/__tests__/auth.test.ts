// src/__tests__/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

// Mock jose functions
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

describe('Auth Middleware', () => {
  const app = new Hono();

  app.use('/protected/*', authMiddleware);
  app.get('/protected/test', (c) => c.text('Success'));

  it('should return 401 if no authorization header is provided', async () => {
    const req = new Request('http://localhost/protected/test');
    const res = await app.request(req);
    
    expect(res.status).toBe(401);
    const response = await res.json();
    expect(response).toEqual({
      error: { 
        code: 'MISSING_AUTH_HEADER', 
        message: 'Authorization header missing or malformed' 
      }
    });
  });

  it('should return 401 if authorization header is malformed', async () => {
    const req = new Request('http://localhost/protected/test', {
      headers: { 'Authorization': 'InvalidToken' }
    });
    const res = await app.request(req);
    
    expect(res.status).toBe(401);
    const response = await res.json();
    expect(response).toEqual({
      error: { 
        code: 'MISSING_AUTH_HEADER', 
        message: 'Authorization header missing or malformed' 
      }
    });
  });

  // Additional tests for valid token scenario would require mocking jwtVerify
});