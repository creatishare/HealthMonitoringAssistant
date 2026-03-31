import { Request, Response, NextFunction } from 'express';
import * as ocrService from '../services/ocr.service';
import { ApiError } from '../middleware/error.middleware';

// 上传图片
export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    // 检查是否有文件上传
    if (!req.file) {
      throw new ApiError('请选择要上传的图片文件', 400, '00002');
    }

    // 保存本地文件路径
    const filePath = req.file.path;

    const imageId = await ocrService.saveImage(userId, filePath);

    res.status(201).json({
      code: 201,
      message: '上传成功',
      data: {
        imageId,
        filePath,
        status: 'uploaded',
      },
    });
  } catch (error) {
    next(error);
  }
}

// 识别图片
export async function recognizeImage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { imageId } = req.body;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    if (!imageId) {
      throw new ApiError('图片ID不能为空', 400, '00002');
    }

    const result = await ocrService.recognizeImage(imageId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 确认OCR结果
export async function confirmOCRResult(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { imageId, recordDate, data, notes } = req.body;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    if (!imageId || !recordDate || !data) {
      throw new ApiError('缺少必要参数', 400, '00002');
    }

    const result = await ocrService.confirmOCRResult(userId, imageId, {
      recordDate,
      extractedData: data,
      notes,
    });

    res.status(201).json({
      code: 201,
      message: '保存成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 获取OCR结果
export async function getOCRResult(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const result = await ocrService.getOCRResult(userId, id);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
