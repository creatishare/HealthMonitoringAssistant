import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import logger from '../utils/logger';

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phone: string;
      };
    }
  }
}

// JWT认证中间件
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        data: null,
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Token验证失败', error);
    return res.status(401).json({
      code: 401,
      message: '认证令牌无效或已过期',
      data: null,
    });
  }
}

// 可选认证中间件（不强制要求登录）
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // 可选认证失败不阻止请求
    next();
  }
}
