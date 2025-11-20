// src/middleware/auth.ts
import { Context, Next } from 'hono';
import { jwtVerify, createRemoteJWKSet } from 'jose';

// 定义环境变量接口
interface Env {
  FIREBASE_PROJECT_ID: string;
}

interface Variables {
  firebaseUid: string;
  email?: string;
}

// 使用正确的 Firebase ID Token 公钥 URL
// 将 JWKS 放在处理程序外部以利用缓存
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
  {
    cacheMaxAge: 600000, // 10分钟
  }
);

export const authMiddleware = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: { code: 'MISSING_AUTH_HEADER', message: 'Authorization header missing or malformed' } }, 401);
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证JWT令牌
    const { payload } = await jwtVerify(
      token,
      JWKS,
      {
        issuer: `https://securetoken.google.com/${c.env.FIREBASE_PROJECT_ID}`,
        audience: c.env.FIREBASE_PROJECT_ID,
      }
    );

    // JWT验证成功，将firebaseUid保存到上下文中
    const firebaseUid = payload.sub as string;
    const email = payload.email as string;

    c.set('firebaseUid', firebaseUid);
    c.set('email', email);

    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } }, 401);
  }
};
