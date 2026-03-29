import { Request, Response, NextFunction } from 'express';
import * as healthRecordService from '../services/health-record.service';
import { ApiError } from '../middleware/error.middleware';

// 获取健康记录列表
export async function getHealthRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { startDate, endDate, metric, page, pageSize } = req.query;

    const result = await healthRecordService.getHealthRecords(userId, {
      startDate: startDate as string,
      endDate: endDate as string,
      metric: metric as string,
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

// 获取单条记录
export async function getHealthRecordById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const record = await healthRecordService.getHealthRecordById(userId, id);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

// 创建健康记录
export async function createHealthRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const {
      recordDate,
      creatinine,
      urea,
      potassium,
      sodium,
      phosphorus,
      uricAcid,
      hemoglobin,
      bloodSugar,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      urineVolume,
      notes,
    } = req.body;

    if (!recordDate) {
      throw new ApiError('记录日期不能为空', 400, '03002');
    }

    const record = await healthRecordService.createHealthRecord(userId, {
      recordDate,
      creatinine,
      urea,
      potassium,
      sodium,
      phosphorus,
      uricAcid,
      hemoglobin,
      bloodSugar,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      urineVolume,
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

// 更新健康记录
export async function updateHealthRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const record = await healthRecordService.updateHealthRecord(userId, id, req.body);

    res.status(200).json({
      code: 200,
      message: '更新成功',
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

// 删除健康记录
export async function deleteHealthRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    await healthRecordService.deleteHealthRecord(userId, id);

    res.status(204).json({
      code: 204,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// 获取趋势数据
export async function getTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { metrics, startDate, endDate } = req.query;

    if (!metrics || !startDate || !endDate) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const metricList = (metrics as string).split(',');

    const result = await healthRecordService.getTrends(
      userId,
      metricList,
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
