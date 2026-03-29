import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { ApiError } from '../middleware/error.middleware';

// 获取仪表盘数据
export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const data = await dashboardService.getDashboardData(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
}
