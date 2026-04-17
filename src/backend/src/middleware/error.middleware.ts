import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

// 自定义API错误类
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = '00001') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

// 错误处理中间件
export function errorHandler(
  err: Error | ApiError | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // 默认错误信息
  let statusCode = 500;
  let message = '服务器内部错误';
  let code = '00001';
  let errors: Array<{ field: string; message: string }> | undefined;

  // 处理ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }
  // 处理AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }
  // 处理验证错误
  else if (err.name === 'ValidationError' || err.name === 'ZodError') {
    statusCode = 400;
    message = '请求参数错误';
    code = '00002';
  }
  // 处理Prisma错误
  else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      message = '资源已存在';
      code = '00004';
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = '资源不存在';
      code = '00004';
    }
  }

  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    code,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
  });

  res.status(statusCode).json({
    code: parseInt(code),
    message,
    errors,
    data: null,
  });
}

// 404处理中间件
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
  });
}
