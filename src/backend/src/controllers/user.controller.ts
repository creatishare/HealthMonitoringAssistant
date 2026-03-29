import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { ApiError } from '../middleware/error.middleware';

// 获取用户档案
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const profile = await userService.getUserProfile(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

// 更新用户档案
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const {
      name,
      gender,
      birthDate,
      height,
      currentWeight,
      dialysisType,
      dryWeight,
      baselineCreatinine,
      diagnosisDate,
      primaryDisease,
    } = req.body;

    const profile = await userService.updateUserProfile(userId, {
      name,
      gender,
      birthDate,
      height,
      currentWeight,
      dialysisType,
      dryWeight,
      baselineCreatinine,
      diagnosisDate,
      primaryDisease,
    });

    res.status(200).json({
      code: 200,
      message: '更新成功',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}
