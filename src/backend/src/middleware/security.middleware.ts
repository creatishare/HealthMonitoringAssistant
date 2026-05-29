import { Request, Response, NextFunction, RequestHandler } from 'express';
import { CorsOptions } from 'cors';
import crypto from 'crypto';
import { getRedisClient } from '../config/redis';
import logger from '../utils/logger';

type RateLimitKeyGenerator = (req: Request) => string;

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: RateLimitKeyGenerator;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_ALLOWED_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getConfiguredOrigins(): string[] {
  return (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsOptions(): CorsOptions {
  const configuredOrigins = getConfiguredOrigins();
  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : process.env.NODE_ENV === 'production'
        ? []
        : DEFAULT_ALLOWED_DEV_ORIGINS;

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  };
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

function getRateLimitKey(req: Request, options: RateLimitOptions): string {
  const baseKey = options.keyGenerator?.(req) || req.ip || 'unknown';
  const rawKey = `${req.method}:${req.baseUrl}${req.path}:${baseKey}`;
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
  return `rate-limit:${hashedKey}`;
}

function sendRateLimitExceeded(res: Response, retryAfterMs: number, message: string): void {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.status(429).json({
    code: 429,
    message,
    data: null,
  });
}

function sendRateLimitUnavailable(res: Response): void {
  res.status(503).json({
    code: 503,
    message: '请求限流服务暂不可用，请稍后再试',
    data: null,
  });
}

async function consumeRedisRateLimit(
  key: string,
  windowMs: number
): Promise<{ count: number; resetInMs: number }> {
  const redis = await getRedisClient();
  if (!redis) {
    throw new Error('Redis unavailable');
  }

  const result = await redis.eval(
    `
      local current = redis.call("INCR", KEYS[1])
      local ttl = redis.call("PTTL", KEYS[1])
      if current == 1 or ttl < 0 then
        redis.call("PEXPIRE", KEYS[1], ARGV[1])
        ttl = tonumber(ARGV[1])
      end
      return { current, ttl }
    `,
    1,
    key,
    String(windowMs)
  );

  if (
    !Array.isArray(result) ||
    typeof result[0] !== 'number' ||
    typeof result[1] !== 'number'
  ) {
    throw new Error('Invalid Redis rate limit response');
  }

  return {
    count: result[0],
    resetInMs: result[1],
  };
}

function consumeMemoryRateLimit(
  key: string,
  windowMs: number
): { count: number; resetInMs: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      count: 1,
      resetInMs: windowMs,
    };
  }

  bucket.count += 1;
  return {
    count: bucket.count,
    resetInMs: bucket.resetAt - now,
  };
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  return async (req, res, next) => {
    const key = getRateLimitKey(req, options);

    try {
      const result = isProduction()
        ? await consumeRedisRateLimit(key, options.windowMs)
        : consumeMemoryRateLimit(key, options.windowMs);

      if (result.count > options.max) {
        sendRateLimitExceeded(res, result.resetInMs, options.message);
        return;
      }

      next();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('请求限流检查失败', { message });

      if (isProduction()) {
        sendRateLimitUnavailable(res);
        return;
      }
    }

    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}, 60 * 1000).unref();

export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: '认证请求过于频繁，请稍后再试',
});

export const verificationCodeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 1,
  message: '验证码发送过于频繁，请稍后再试',
  keyGenerator: (req) => {
    const phone = typeof req.body?.phone === 'string' ? req.body.phone : '';
    return phone || req.ip || 'unknown';
  },
});
