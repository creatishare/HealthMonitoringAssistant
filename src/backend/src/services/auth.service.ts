import prisma from '../config/database';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, revokeRefreshToken, revokeAllUserRefreshTokens } from '../utils/jwt';
import { isValidPhone, isValidVerificationCode } from '../utils/validators';
import logger from '../utils/logger';
import { sendVerificationCode as sendSMSCode } from './notification.service';

// 模拟验证码存储（生产环境应使用Redis）
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

// 注册
export async function register(
  phone: string,
  password: string,
  verificationCode: string,
  ipAddress?: string,
  userAgent?: string
) {
  // 验证手机号格式
  if (!isValidPhone(phone)) {
    throw new Error('手机号格式不正确');
  }

  // 验证密码强度
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.message);
  }

  // 验证验证码
  const codeData = verificationCodes.get(phone);
  if (!codeData || codeData.code !== verificationCode || Date.now() > codeData.expiresAt) {
    throw new Error('验证码错误或已过期');
  }

  // 检查手机号是否已注册
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    throw new Error('手机号已注册');
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      profile: {
        create: {
          dialysisType: 'none',
        },
      },
    },
    include: {
      profile: true,
    },
  });

  // 清除验证码
  verificationCodes.delete(phone);

  // 生成令牌
  const tokens = await generateTokenPair(
    { userId: user.id, phone: user.phone },
    ipAddress,
    userAgent
  );

  logger.info(`用户注册成功: ${phone}`);

  return {
    userId: user.id,
    ...tokens,
  };
}

// 登录
export async function login(
  phone: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
) {
  // 验证手机号格式
  if (!isValidPhone(phone)) {
    throw new Error('手机号格式不正确');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    throw new Error('手机号未注册');
  }

  if (user.status !== 'active') {
    throw new Error('账户已被冻结');
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('密码错误');
  }

  // 生成令牌
  const tokens = await generateTokenPair(
    { userId: user.id, phone: user.phone },
    ipAddress,
    userAgent
  );

  logger.info(`用户登录成功: ${phone}`);

  return {
    userId: user.id,
    ...tokens,
  };
}

// 登出
export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    try {
      const decoded = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64').toString());
      if (decoded.jti) {
        await revokeRefreshToken(decoded.jti);
      }
    } catch (error) {
      logger.warn('解析刷新令牌失败', error);
    }
  }

  logger.info(`用户登出: ${userId}`);
}

// 刷新令牌
export async function refreshTokens(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // 解析刷新令牌
    const decoded = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64').toString());

    if (!decoded.jti || !decoded.userId) {
      throw new Error('无效的刷新令牌');
    }

    // 检查令牌是否被吊销
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenJti: decoded.jti },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new Error('刷新令牌已过期或无效');
    }

    // 吊销旧令牌
    await revokeRefreshToken(decoded.jti);

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status !== 'active') {
      throw new Error('用户不存在或已被冻结');
    }

    // 生成新令牌
    const tokens = await generateTokenPair(
      { userId: user.id, phone: user.phone },
      ipAddress,
      userAgent
    );

    return tokens;
  } catch (error) {
    logger.error('刷新令牌失败', error);
    throw new Error('刷新令牌失败');
  }
}

// 发送验证码（模拟）
export async function sendVerificationCode(phone: string, type: 'register' | 'reset-password') {
  if (!isValidPhone(phone)) {
    throw new Error('手机号格式不正确');
  }

  // 检查是否频繁发送
  const existingCode = verificationCodes.get(phone);
  if (existingCode && Date.now() < existingCode.expiresAt - 240000) {
    throw new Error('请稍后再试');
  }

  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 保存验证码（5分钟有效）
  verificationCodes.set(phone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  // 调用短信服务发送验证码
  try {
    await sendSMSCode(phone, code);
    logger.info(`验证码短信已发送: ${phone}`);
  } catch (error) {
    logger.error(`发送验证码短信失败: ${phone}`, error);
    // 短信发送失败不影响返回，开发环境可查看日志获取验证码
  }

  return {
    expireIn: 300,
  };
}

// 修改密码
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
) {
  // 验证新密码强度
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.message);
  }

  // 获取用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 验证旧密码
  const isValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('原密码错误');
  }

  // 哈希新密码
  const newPasswordHash = await hashPassword(newPassword);

  // 更新密码
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // 吊销所有刷新令牌
  await revokeAllUserRefreshTokens(userId);

  logger.info(`用户修改密码: ${userId}`);
}
