import { Request, Response, NextFunction } from 'express';
import { UserType, PrimaryDisease } from '@prisma/client';
import * as userService from '../services/user.service';
import { ApiError } from '../middleware/error.middleware';

function isUserType(value: unknown): value is UserType {
  return value === 'kidney_failure' || value === 'kidney_transplant' || value === 'other';
}

function isPrimaryDisease(value: unknown): value is PrimaryDisease {
  return value === 'diabetic_nephropathy' || value === 'hypertensive_nephropathy' || value === 'chronic_glomerulonephritis' || value === 'other';
}

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
      userType,
      dialysisType,
      dryWeight,
      baselineCreatinine,
      diagnosisDate,
      primaryDisease,
      hasTransplant,
      transplantDate,
    } = req.body;

    const profile = await userService.updateUserProfile(userId, {
      name,
      gender,
      birthDate,
      height,
      currentWeight,
      userType,
      dialysisType,
      dryWeight,
      baselineCreatinine,
      diagnosisDate,
      primaryDisease,
      hasTransplant,
      transplantDate,
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

// 完成首次登录初始化
export async function completeOnboarding(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { userType, primaryDisease, name, gender, birthDate, height, currentWeight, diagnosisDate, transplantDate } = req.body;

    if (!isUserType(userType)) {
      throw new ApiError('用户身份类型无效', 400, '01001');
    }

    if (primaryDisease !== undefined && !isPrimaryDisease(primaryDisease)) {
      throw new ApiError('原发疾病类型无效', 400, '01008');
    }

    const profile = await userService.completeOnboarding(userId, userType, primaryDisease, {
      name,
      gender,
      birthDate,
      height,
      currentWeight,
      diagnosisDate,
      transplantDate,
    });

    res.status(200).json({
      code: 200,
      message: '初始化完成',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}
