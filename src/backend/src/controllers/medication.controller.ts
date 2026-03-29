import { Request, Response, NextFunction } from 'express';
import * as medicationService from '../services/medication.service';
import { ApiError } from '../middleware/error.middleware';

// 获取用药列表
export async function getMedications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { status } = req.query;

    const result = await medicationService.getMedications(userId, status as string);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 添加用药
export async function createMedication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const {
      name,
      specification,
      dosage,
      dosageUnit,
      frequency,
      reminderTimes,
      reminderMinutesBefore,
    } = req.body;

    if (!name || !dosage || !dosageUnit || !frequency || !reminderTimes) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const medication = await medicationService.createMedication(userId, {
      name,
      specification,
      dosage,
      dosageUnit,
      frequency,
      reminderTimes,
      reminderMinutesBefore,
    });

    res.status(201).json({
      code: 201,
      message: '添加成功',
      data: medication,
    });
  } catch (error) {
    next(error);
  }
}

// 更新用药
export async function updateMedication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const medication = await medicationService.updateMedication(userId, id, req.body);

    res.status(200).json({
      code: 200,
      message: '更新成功',
      data: medication,
    });
  } catch (error) {
    next(error);
  }
}

// 删除用药
export async function deleteMedication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    await medicationService.deleteMedication(userId, id);

    res.status(204).json({
      code: 204,
      message: '删除成功',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

// 暂停用药
export async function pauseMedication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const medication = await medicationService.pauseMedication(userId, id);

    res.status(200).json({
      code: 200,
      message: '已暂停提醒',
      data: medication,
    });
  } catch (error) {
    next(error);
  }
}

// 恢复用药
export async function resumeMedication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const medication = await medicationService.resumeMedication(userId, id);

    res.status(200).json({
      code: 200,
      message: '已恢复提醒',
      data: medication,
    });
  } catch (error) {
    next(error);
  }
}

// 获取今日用药
export async function getTodayMedications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const result = await medicationService.getTodayMedications(userId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 记录服药
export async function recordMedication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { medicationId, scheduledTime, actualTime, status, skipReason, notes } = req.body;

    if (!medicationId || !scheduledTime || !status) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const log = await medicationService.recordMedication(userId, {
      medicationId,
      scheduledTime,
      actualTime,
      status,
      skipReason,
      notes,
    });

    res.status(201).json({
      code: 201,
      message: '记录成功',
      data: log,
    });
  } catch (error) {
    next(error);
  }
}

// 获取服药记录
export async function getMedicationLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { medicationId, date, status, page, pageSize } = req.query;

    const result = await medicationService.getMedicationLogs(userId, {
      medicationId: medicationId as string,
      date: date as string,
      status: status as string,
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

// 获取用药统计
export async function getMedicationStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const result = await medicationService.getMedicationStatistics(
      userId,
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
