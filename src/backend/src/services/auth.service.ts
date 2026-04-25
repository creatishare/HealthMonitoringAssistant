import prisma from '../config/database';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, revokeRefreshToken, revokeAllUserRefreshTokens } from '../utils/jwt';
import { isValidPhone, isValidVerificationCode } from '../utils/validators';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { maskPhone } from '../utils/privacy';
import {
  sendVerificationCode as sendSMSCode,
  verifySmsCode,
  getSMSConfig,
} from './notification.service';

// 验证码存储（生产环境应使用Redis）
const verificationCodes = new Map<
  string,
  { code: string; bizId?: string; expiresAt: number }
>();

function formatAuthUser(user: any) {
  return {
    userId: user.id,
    phone: user.phone,
    name: user.profile?.name,
    onboardingCompleted: user.profile?.onboardingCompleted ?? false,
  };
}

async function validateVerificationCode(phone: string, code: string) {
  const config = getSMSConfig();

  // 先检查本地存储（用于模拟模式或快速验证）
  const codeData = verificationCodes.get(phone);
  if (
    codeData &&
    codeData.code === code &&
    Date.now() <= codeData.expiresAt
  ) {
    return true;
  }

  // 尝试服务端验证（阿里云真实服务）
  if (codeData?.bizId) {
    const serverValid = await verifySmsCode(phone, code);
    if (serverValid) {
      return true;
    }
  }

  throw new AppError('验证码错误或已过期', 400, '01003');
}

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
    throw new AppError('手机号格式不正确', 400, '01001');
  }

  // 验证密码强度
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    throw new AppError(passwordCheck.message || '密码不符合要求', 400, '00002');
  }

  // 验证验证码
  await validateVerificationCode(phone, verificationCode);

  // 检查手机号是否已注册
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    throw new AppError('手机号已注册', 409, '01005');
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

  logger.info(`用户注册成功: ${maskPhone(phone)}`);

  return {
    ...formatAuthUser(user),
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
    throw new AppError('手机号格式不正确', 400, '01001');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError('手机号未注册', 400, '01006');
  }

  if (user.status !== 'active') {
    throw new AppError('账户已被冻结', 403, '01008');
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('密码错误', 401, '01009');
  }

  // 生成令牌
  const tokens = await generateTokenPair(
    { userId: user.id, phone: user.phone },
    ipAddress,
    userAgent
  );

  logger.info(`用户登录成功: ${maskPhone(phone)}`);

  return {
    ...formatAuthUser(user),
    ...tokens,
  };
}

// 登出
export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    try {
      const decoded = JSON.parse(
        Buffer.from(refreshToken.split('.')[1], 'base64').toString()
      );
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
    const decoded = JSON.parse(
      Buffer.from(refreshToken.split('.')[1], 'base64').toString()
    );

    if (!decoded.jti || !decoded.userId) {
      throw new AppError('无效的刷新令牌', 401, '01009');
    }

    // 检查令牌是否被吊销
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenJti: decoded.jti },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new AppError('刷新令牌已过期或无效', 401, '01009');
    }

    // 吊销旧令牌
    await revokeRefreshToken(decoded.jti);

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (!user || user.status !== 'active') {
      throw new AppError('用户不存在或已被冻结', 403, '01008');
    }

    // 生成新令牌
    const tokens = await generateTokenPair(
      { userId: user.id, phone: user.phone },
      ipAddress,
      userAgent
    );

    return tokens;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('刷新令牌失败', error);
    throw new AppError('刷新令牌失败', 401, '01009');
  }
}

// 发送验证码
export async function sendVerificationCode(
  phone: string,
  type: 'register' | 'reset-password' = 'register'
) {
  if (!isValidPhone(phone)) {
    throw new AppError('手机号格式不正确', 400, '01001');
  }

  const config = getSMSConfig();

  // 检查是否频繁发送
  const existingCode = verificationCodes.get(phone);
  if (existingCode) {
    const sendTime = existingCode.expiresAt - config.verificationValidTimeSeconds * 1000;
    const elapsed = Date.now() - sendTime;
    if (elapsed < config.verificationIntervalSeconds * 1000) {
      throw new AppError('请稍后再试', 429, '01002');
    }
  }

  // 根据类型检查用户是否存在
  const existingUser = await prisma.user.findUnique({ where: { phone } });

  if (type === 'register' && existingUser) {
    throw new AppError('手机号已注册', 409, '01005');
  }

  if (type === 'reset-password' && !existingUser) {
    throw new AppError('手机号未注册', 400, '01006');
  }

  // 调用短信服务
  let smsResult = await sendSMSCode(phone);
  let verifyCode = smsResult.verifyCode;

  // 开发环境回退：阿里云失败时自动生成模拟验证码，确保本地测试可用
  if ((!smsResult.success || !verifyCode) && process.env.NODE_ENV === 'development') {
    verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    logger.warn(`[开发回退] 阿里云短信发送失败，使用模拟验证码: ${maskPhone(phone)} => ${verifyCode}`);
    smsResult = { success: true, verifyCode };
  }

  if (!smsResult.success || !verifyCode) {
    throw new AppError('验证码发送失败', 500, '01010');
  }

  // 保存验证码
  const expiresAt = Date.now() + config.verificationValidTimeSeconds * 1000;
  verificationCodes.set(phone, {
    code: verifyCode,
    bizId: smsResult.bizId,
    expiresAt,
  });

  logger.info(`验证码已发送: ${maskPhone(phone)}`);

  return {
    expireIn: config.verificationValidTimeSeconds,
    bizId: smsResult.bizId,
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
    throw new AppError(passwordCheck.message || '密码不符合要求', 400, '00002');
  }

  // 获取用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('用户不存在', 404, '01004');
  }

  // 验证旧密码
  const isValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('原密码错误', 401, '01009');
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

// 重置密码（忘记密码）
export async function resetPassword(
  phone: string,
  verificationCode: string,
  newPassword: string
) {
  // 验证手机号格式
  if (!isValidPhone(phone)) {
    throw new AppError('手机号格式不正确', 400, '01001');
  }

  // 验证密码强度
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    throw new AppError(passwordCheck.message || '密码不符合要求', 400, '00002');
  }

  // 验证验证码
  await validateVerificationCode(phone, verificationCode);

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    throw new AppError('手机号未注册', 400, '01006');
  }

  // 哈希新密码
  const newPasswordHash = await hashPassword(newPassword);

  // 更新密码
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  // 吊销所有刷新令牌（让用户重新登录）
  await revokeAllUserRefreshTokens(user.id);

  // 清除验证码
  verificationCodes.delete(phone);

  logger.info(`用户重置密码成功: ${maskPhone(phone)}`);
}
