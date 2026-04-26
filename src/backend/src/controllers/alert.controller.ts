import { Request, Response, NextFunction } from 'express';
import * as alertService from '../services/alert.service';
import { ApiError } from '../middleware/error.middleware';

// 获取预警列表
export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { level, isRead, page, pageSize } = req.query;

    const result = await alertService.getAlerts(userId, {
      level: level as string,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 获取未读预警数量
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const count = await alertService.getUnreadAlertCount(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: count,
    });
  } catch (error) {
    next(error);
  }
}

// 标记预警为已读
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    await alertService.markAlertAsRead(userId, id);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// 标记所有预警为已读
export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    await alertService.markAllAlertsAsRead(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// 删除预警
export async function deleteAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    await alertService.deleteAlert(userId, id);

    res.status(200).json({
      code: 200,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// 删除所有已读预警
export async function deleteReadAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const count = await alertService.deleteReadAlerts(userId);

    res.status(200).json({
      code: 200,
      message: '删除成功',
      data: { count },
    });
  } catch (error) {
    next(error);
  }
}
