/**
 * OCR 控制器
 * @version 1.0.0
 * @description 处理化验单图片上传、识别、核对和确认保存
 */

import { Request, Response } from 'express';
import { ocrService, labReportParser } from '../services/ocrService';
import { OCRResult, OCRUploadResult, HealthRecordFormData } from '../../shared/types';

/**
 * POST /ocr/upload
 * 上传化验单图片
 */
export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    // 检查是否有文件上传
    if (!req.file && !req.body.image) {
      res.status(400).json({
        code: '07002',
        message: '请提供图片文件',
        data: null,
      });
      return;
    }

    let imageBase64: string;

    // 处理文件上传（multipart/form-data）
    if (req.file) {
      // 检查文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          code: '07002',
          message: '图片格式不支持，请上传 JPG 或 PNG 格式',
          data: null,
        });
        return;
      }

      // 检查文件大小（最大 5MB）
      const maxSize = 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        res.status(400).json({
          code: '07003',
          message: '图片大小超过限制（最大 5MB）',
          data: null,
        });
        return;
      }

      // 转换为 Base64
      imageBase64 = req.file.buffer.toString('base64');
    } else {
      // 处理 Base64 图片数据
      imageBase64 = req.body.image;
    }

    // 生成图片 ID
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TODO: 上传图片到 OSS（MVP 阶段可暂存本地或内存）
    // const imageUrl = await uploadToOSS(imageBase64, imageId);
    const imageUrl = `/uploads/${imageId}.jpg`;

    const result: OCRUploadResult = {
      imageId,
      imageUrl,
      status: 'uploaded',
    };

    res.status(200).json({
      code: 200,
      message: '上传成功',
      data: result,
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({
      code: '07001',
      message: '图片上传失败，请稍后重试',
      data: null,
    });
  }
}

/**
 * POST /ocr/recognize
 * 识别化验单
 */
export async function recognizeLabReport(req: Request, res: Response): Promise<void> {
  try {
    const { imageId, imageBase64 } = req.body;

    if (!imageId && !imageBase64) {
      res.status(400).json({
        code: '07002',
        message: '请提供图片 ID 或图片数据',
        data: null,
      });
      return;
    }

    // 获取图片数据
    let imageData: string;
    if (imageBase64) {
      imageData = imageBase64;
    } else {
      // TODO: 从存储中获取图片（OSS 或本地）
      // imageData = await getImageFromStorage(imageId);
      res.status(400).json({
        code: '07002',
        message: '请提供图片数据',
        data: null,
      });
      return;
    }

    // 调用 OCR 服务识别
    const recognitionResult = await ocrService.recognize(imageData);

    if (!recognitionResult.success) {
      res.status(422).json({
        code: '07004',
        message: 'OCR 识别失败，请检查图片清晰度',
        data: {
          imageId,
          success: false,
        },
      });
      return;
    }

    // 解析提取的数据
    const parseResult = labReportParser.parse(recognitionResult.rawText);

    // 检查是否识别到有效指标
    if (Object.keys(parseResult.extracted).length === 0) {
      res.status(422).json({
        code: '07005',
        message: '未识别到有效指标，请检查图片是否为化验单',
        data: {
          imageId,
          rawText: recognitionResult.rawText,
        },
      });
      return;
    }

    // 构建响应数据
    const response = {
      imageId,
      success: true,
      rawText: recognitionResult.rawText,
      extracted: parseResult.extracted,
      lowConfidence: parseResult.lowConfidence,
      recordDate: parseResult.recordDate || new Date().toISOString().split('T')[0],
      hospital: parseResult.hospital,
    };

    res.status(200).json({
      code: 200,
      message: '识别成功',
      data: response,
    });
  } catch (error) {
    console.error('化验单识别失败:', error);
    res.status(500).json({
      code: '07004',
      message: '识别服务暂时不可用，请稍后重试',
      data: null,
    });
  }
}

/**
 * POST /ocr/confirm
 * 确认并保存 OCR 结果
 */
export async function confirmOCRResult(req: Request, res: Response): Promise<void> {
  try {
    const { imageId, recordDate, data, notes } = req.body;

    // 验证必填字段
    if (!imageId || !recordDate || !data) {
      res.status(400).json({
        code: '00002',
        message: '缺少必要参数：imageId、recordDate、data',
        data: null,
      });
      return;
    }

    // 验证数据有效性
    const validatedData = validateHealthRecordData(data);
    if (!validatedData.valid) {
      res.status(422).json({
        code: '03003',
        message: validatedData.error || '指标值超出合理范围',
        data: null,
      });
      return;
    }

    // TODO: 调用健康记录服务保存数据
    // const recordId = await healthRecordService.create({
    //   userId: req.user.id,
    //   recordDate,
    //   ...data,
    //   notes,
    //   source: 'ocr',
    // });

    // 生成模拟记录 ID（MVP 阶段）
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TODO: 触发预警检测
    // const alerts = await alertEngine.checkMetrics(req.user.id, data);
    const alerts: Array<{ id: string; level: string; message: string }> = [];

    // 检查是否有异常指标并生成预警
    const abnormalMetrics = checkAbnormalMetrics(data);
    if (abnormalMetrics.length > 0) {
      for (const metric of abnormalMetrics) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          level: metric.level,
          message: metric.message,
        });
      }
    }

    res.status(201).json({
      code: 201,
      message: '保存成功',
      data: {
        recordId,
        alerts,
      },
    });
  } catch (error) {
    console.error('保存 OCR 结果失败:', error);
    res.status(500).json({
      code: '00001',
      message: '保存失败，请稍后重试',
      data: null,
    });
  }
}

/**
 * GET /ocr/result/:imageId
 * 获取 OCR 识别结果
 */
export async function getOCRResult(req: Request, res: Response): Promise<void> {
  try {
    const { imageId } = req.params;

    // TODO: 从缓存或数据库获取识别结果
    // const result = await ocrCache.get(imageId);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        imageId,
        status: 'completed',
        // ...result
      },
    });
  } catch (error) {
    console.error('获取 OCR 结果失败:', error);
    res.status(500).json({
      code: '00001',
      message: '获取失败，请稍后重试',
      data: null,
    });
  }
}

// ==================== 辅助函数 ====================

/**
 * 验证健康记录数据
 */
function validateHealthRecordData(data: Partial<HealthRecordFormData>): { valid: boolean; error?: string } {
  const ranges: { [key: string]: { min: number; max: number } } = {
    creatinine: { min: 10, max: 2000 },
    urea: { min: 0.5, max: 100 },
    potassium: { min: 1, max: 10 },
    sodium: { min: 100, max: 200 },
    phosphorus: { min: 0.1, max: 5 },
    uricAcid: { min: 50, max: 1000 },
    hemoglobin: { min: 50, max: 200 },
    bloodSugar: { min: 1, max: 30 },
    weight: { min: 20, max: 300 },
    bloodPressureSystolic: { min: 70, max: 250 },
    bloodPressureDiastolic: { min: 40, max: 150 },
    urineVolume: { min: 0, max: 5000 },
  };

  for (const [field, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    const range = ranges[field];
    if (range) {
      if (typeof value !== 'number' || value < range.min || value > range.max) {
        return {
          valid: false,
          error: `${field} 的值 ${value} 超出合理范围（${range.min}-${range.max}）`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * 检查异常指标
 */
function checkAbnormalMetrics(data: Partial<HealthRecordFormData>): Array<{ level: string; message: string }> {
  const alerts: Array<{ level: string; message: string }> = [];

  // 高钾血症检测
  if (data.potassium !== undefined) {
    if (data.potassium > 6.0) {
      alerts.push({
        level: 'critical',
        message: `血钾严重超标（${data.potassium} mmol/L），请立即联系医生或前往急诊！`,
      });
    } else if (data.potassium > 5.5) {
      alerts.push({
        level: 'warning',
        message: `血钾偏高（${data.potassium} mmol/L），请注意饮食控制并及时就医`,
      });
    }
  }

  // 肌酐升高检测
  if (data.creatinine !== undefined && data.creatinine > 300) {
    alerts.push({
      level: 'warning',
      message: `肌酐明显升高（${data.creatinine} μmol/L），建议及时就医复查`,
    });
  }

  // 高尿酸检测
  if (data.uricAcid !== undefined && data.uricAcid > 420) {
    alerts.push({
      level: 'info',
      message: `尿酸偏高（${data.uricAcid} μmol/L），注意控制饮食，多饮水`,
    });
  }

  // 贫血检测
  if (data.hemoglobin !== undefined && data.hemoglobin < 110) {
    alerts.push({
      level: 'info',
      message: `血红蛋白偏低（${data.hemoglobin} g/L），建议复查血常规`,
    });
  }

  return alerts;
}
