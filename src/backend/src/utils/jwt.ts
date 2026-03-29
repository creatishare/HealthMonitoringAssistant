import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN_RAW = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN_RAW = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_EXPIRES_IN = JWT_EXPIRES_IN_RAW as jwt.SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRES_IN = JWT_REFRESH_EXPIRES_IN_RAW as jwt.SignOptions['expiresIn'];

export interface TokenPayload {
  userId: string;
  phone: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 生成访问令牌
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
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
  const expiresInDays = parseInt(JWT_REFRESH_EXPIRES_IN_RAW) || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

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

  return jwt.sign({ userId, jti }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

// 验证访问令牌
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

// 验证刷新令牌
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; jti: string };

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
  const expiresInMatch = JWT_EXPIRES_IN_RAW.match(/(\d+)/);
  const expiresIn = expiresInMatch ? parseInt(expiresInMatch[1]) * 3600 : 86400;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}
