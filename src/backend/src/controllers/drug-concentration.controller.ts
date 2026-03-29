import { Request, Response, NextFunction } from 'express';
import * as drugConcentrationService from '../services/drug-concentration.service';
import { ApiError } from '../middleware/error.middleware';

// 获取血药浓度记录列表
export async function getDrugConcentrations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { drugType, startDate, endDate, page, pageSize } = req.query;

    const result = await drugConcentrationService.getDrugConcentrations(userId, {
      drugType: drugType as string,
      startDate: startDate as string,
      endDate: endDate as string,
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

// 创建血药浓度记录
export async function createDrugConcentration(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const {
      recordDate,
      drugType,
      drugName,
      concentration,
      samplingTime,
      lastDoseTime,
      bloodDrawTime,
      notes,
    } = req.body;

    if (!recordDate || !drugType || !drugName || !concentration || !samplingTime || !lastDoseTime || !bloodDrawTime) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const record = await drugConcentrationService.createDrugConcentration(userId, {
      recordDate,
      drugType,
      drugName,
      concentration,
      samplingTime,
      lastDoseTime,
      bloodDrawTime,
      notes,
    });

    res.status(201).json({
      code: 201,
      message: '创建成功',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

// 获取血药浓度趋势
export async function getDrugConcentrationTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { drugType, startDate, endDate } = req.query;

    if (!drugType || !startDate || !endDate) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const result = await drugConcentrationService.getDrugConcentrationTrends(
      userId,
      drugType as any,
      startDate as string,
      endDate as string
    );

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
