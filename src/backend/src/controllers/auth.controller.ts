import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { ApiError } from '../middleware/error.middleware';

// 注册
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, password, verificationCode } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!phone || !password || !verificationCode) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const result = await authService.register(phone, password, verificationCode, ipAddress, userAgent);

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 登录
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!phone || !password) {
      throw new ApiError('手机号和密码不能为空', 400, '00002');
    }

    const result = await authService.login(phone, password, ipAddress, userAgent);

    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 登出
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { refreshToken } = req.body;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    await authService.logout(userId, refreshToken);

    res.status(200).json({
      code: 200,
      message: '登出成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// 刷新令牌
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('未提供刷新令牌', 401, '01009');
    }

    const refreshToken = authHeader.substring(7);
    const result = await authService.refreshTokens(refreshToken, ipAddress, userAgent);

    res.status(200).json({
      code: 200,
      message: '刷新成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 发送验证码
export async function sendVerificationCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, type = 'register' } = req.body;

    if (!phone) {
      throw new ApiError('手机号不能为空', 400, '01001');
    }

    const result = await authService.sendVerificationCode(phone, type);

    res.status(200).json({
      code: 200,
      message: '验证码已发送',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 修改密码
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    if (!oldPassword || !newPassword) {
      throw new ApiError('原密码和新密码不能为空', 400, '00002');
    }

    await authService.changePassword(userId, oldPassword, newPassword);

    res.status(200).json({
      code: 200,
      message: '密码修改成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// 重置密码（忘记密码）
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, verificationCode, newPassword } = req.body;

    if (!phone || !verificationCode || !newPassword) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    await authService.resetPassword(phone, verificationCode, newPassword);

    res.status(200).json({
      code: 200,
      message: '密码重置成功，请使用新密码登录',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}
