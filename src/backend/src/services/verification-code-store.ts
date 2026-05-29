import crypto from 'crypto';
import type Redis from 'ioredis';
import { getRedisClient } from '../config/redis';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export type VerificationCodeType = 'register' | 'reset-password';

export interface VerificationCodeEntry {
  code: string;
  bizId?: string;
  expiresAt: number;
}

const memoryCodes = new Map<string, VerificationCodeEntry>();

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getVerificationCodeKey(phone: string, type: VerificationCodeType): string {
  const hash = crypto.createHash('sha256').update(`${type}:${phone}`).digest('hex');
  return `auth:verification:${type}:${hash}`;
}

function sanitizeTtlSeconds(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return 300;
  }

  return Math.ceil(ttlSeconds);
}

function parseEntry(raw: string | null): VerificationCodeEntry | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<VerificationCodeEntry>;
    if (
      typeof parsed.code === 'string' &&
      typeof parsed.expiresAt === 'number' &&
      (parsed.bizId === undefined || typeof parsed.bizId === 'string')
    ) {
      return {
        code: parsed.code,
        bizId: parsed.bizId,
        expiresAt: parsed.expiresAt,
      };
    }
  } catch (error) {
    logger.warn('验证码缓存数据解析失败，将按不存在处理');
  }

  return null;
}

function getMemoryEntry(key: string): VerificationCodeEntry | null {
  const entry = memoryCodes.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCodes.delete(key);
    return null;
  }

  return entry;
}

function handleRedisError(error: unknown): null {
  const message = error instanceof Error ? error.message : String(error);
  if (isProduction()) {
    logger.error('验证码Redis存储不可用', { message });
    throw new AppError('验证码服务暂不可用，请稍后再试', 503, '01011');
  }

  logger.warn('验证码Redis存储不可用，开发环境回退内存存储', { message });
  return null;
}

async function getOptionalRedisClient(): Promise<Redis | null> {
  try {
    return await getRedisClient();
  } catch (error) {
    return handleRedisError(error);
  }
}

export async function ensureVerificationCodeStoreAvailable(): Promise<void> {
  await getOptionalRedisClient();
}

export async function getVerificationCode(
  phone: string,
  type: VerificationCodeType
): Promise<VerificationCodeEntry | null> {
  const key = getVerificationCodeKey(phone, type);
  const redis = await getOptionalRedisClient();

  if (redis) {
    try {
      const entry = parseEntry(await redis.get(key));
      if (entry && entry.expiresAt <= Date.now()) {
        await redis.del(key);
        return null;
      }

      return entry;
    } catch (error) {
      handleRedisError(error);
    }
  }

  return getMemoryEntry(key);
}

export async function setVerificationCode(
  phone: string,
  type: VerificationCodeType,
  code: string,
  ttlSeconds: number,
  bizId?: string
): Promise<void> {
  const key = getVerificationCodeKey(phone, type);
  const ttl = sanitizeTtlSeconds(ttlSeconds);
  const entry: VerificationCodeEntry = {
    code,
    bizId,
    expiresAt: Date.now() + ttl * 1000,
  };
  const redis = await getOptionalRedisClient();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(entry), 'EX', ttl);
      return;
    } catch (error) {
      handleRedisError(error);
    }
  }

  memoryCodes.set(key, entry);
}

export async function deleteVerificationCode(
  phone: string,
  type: VerificationCodeType
): Promise<void> {
  const key = getVerificationCodeKey(phone, type);
  const redis = await getOptionalRedisClient();

  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      handleRedisError(error);
    }
  }

  memoryCodes.delete(key);
}
