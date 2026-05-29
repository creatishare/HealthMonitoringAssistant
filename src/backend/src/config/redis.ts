import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis | null = null;
let connectPromise: Promise<Redis | null> | null = null;
let developmentRetryAfter = 0;

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getRedisUrl(): string | null {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    return redisUrl;
  }

  return isProduction() ? null : 'redis://localhost:6379';
}

function createRedisClient(redisUrl: string): Redis {
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });

  client.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (isProduction()) {
      logger.error('Redis连接异常', { message });
      return;
    }

    logger.warn('Redis连接异常，开发环境可回退内存存储', { message });
  });

  client.on('connect', () => {
    logger.info('Redis连接已建立');
  });

  return client;
}

export async function getRedisClient(): Promise<Redis | null> {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    throw new Error('REDIS_URL must be configured in production');
  }

  if (!isProduction() && developmentRetryAfter > Date.now()) {
    return null;
  }

  if (!redisClient || redisClient.status === 'end') {
    redisClient = createRedisClient(redisUrl);
  }

  if (redisClient.status === 'ready') {
    return redisClient;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = redisClient
    .connect()
    .then(() => {
      connectPromise = null;
      developmentRetryAfter = 0;
      return redisClient;
    })
    .catch((error) => {
      connectPromise = null;
      if (isProduction()) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Redis不可用，开发环境回退内存存储', { message });
      developmentRetryAfter = Date.now() + 30 * 1000;
      return null;
    });

  return connectPromise;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
  connectPromise = null;
  developmentRetryAfter = 0;
}
