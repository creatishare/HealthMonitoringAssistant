import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import logger from './logger';

const DEFAULT_DEV_JWT_SECRET = 'development-only-secret';
const JWT_EXPIRES_IN_RAW = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN_RAW = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_EXPIRES_IN = JWT_EXPIRES_IN_RAW as jwt.SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRES_IN = JWT_REFRESH_EXPIRES_IN_RAW as jwt.SignOptions['expiresIn'];
let warnedAboutDevSecret = false;

export interface TokenPayload {
  userId: string;
  phone: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  if (!warnedAboutDevSecret) {
    logger.warn('JWT_SECRET未配置，开发环境将使用临时密钥');
    warnedAboutDevSecret = true;
  }

  return DEFAULT_DEV_JWT_SECRET;
}

function parseDurationSeconds(value: string, defaultSeconds: number): number {
  const match = value.match(/^(\d+)([smhd])?$/);
  if (!match) {
    return defaultSeconds;
  }

  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[unit];
}

// 生成访问令牌
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// 生成刷新令牌
export async function generateRefreshToken(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const jti = uuidv4();
  const expiresInSeconds = parseDurationSeconds(JWT_REFRESH_EXPIRES_IN_RAW, 7 * 24 * 60 * 60);
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

  // 保存到数据库
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenJti: jti,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return jwt.sign({ userId, jti }, getJwtSecret(), {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

// 验证访问令牌
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}

// 验证刷新令牌
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; jti: string };

  // 检查令牌是否被吊销
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { tokenJti: decoded.jti },
  });

  if (!refreshToken || refreshToken.isRevoked || refreshToken.expiresAt < new Date()) {
    throw new Error('Invalid refresh token');
  }

  return { userId: decoded.userId, phone: '' };
}

// 吊销刷新令牌
export async function revokeRefreshToken(jti: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { tokenJti: jti },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
}

// 吊销用户的所有刷新令牌
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
}

// 生成令牌对
export async function generateTokenPair(
  payload: TokenPayload,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenResponse> {
  const accessToken = generateAccessToken(payload);
  const refreshToken = await generateRefreshToken(payload.userId, ipAddress, userAgent);

  // 解析过期时间
  const expiresIn = parseDurationSeconds(JWT_EXPIRES_IN_RAW, 24 * 60 * 60);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}
