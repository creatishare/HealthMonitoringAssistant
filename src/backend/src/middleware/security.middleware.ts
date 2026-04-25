import { Request, Response, NextFunction, RequestHandler } from 'express';
import { CorsOptions } from 'cors';

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

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const baseKey = options.keyGenerator?.(req) || req.ip || 'unknown';
    const key = `${req.method}:${req.baseUrl}${req.path}:${baseKey}`;
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        code: 429,
        message: options.message,
        data: null,
      });
      return;
    }

    bucket.count += 1;
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
