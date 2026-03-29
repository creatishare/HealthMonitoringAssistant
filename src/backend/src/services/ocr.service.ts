import prisma from '../config/database';
import logger from '../utils/logger';

// OCR识别结果
interface OCRResult {
  success: boolean;
  rawText: string;
  extracted: {
    [key: string]: {
      value: number;
      unit: string;
      confidence: number;
      referenceRange?: [number, number];
    };
  };
  lowConfidence: string[];
  recordDate?: string;
  hospital?: string;
}

// 指标名称映射
const metricNameMap: Record<string, string> = {
  '肌酐': 'creatinine',
  '血清肌酐': 'creatinine',
  'Cr': 'creatinine',
  '尿素氮': 'urea',
  'BUN': 'urea',
  '钾': 'potassium',
  '血钾': 'potassium',
  'K': 'potassium',
  '钠': 'sodium',
  '血钠': 'sodium',
  'Na': 'sodium',
  '磷': 'phosphorus',
  '血磷': 'phosphorus',
  'P': 'phosphorus',
  '尿酸': 'uricAcid',
  'UA': 'uricAcid',
  '血红蛋白': 'hemoglobin',
  'Hb': 'hemoglobin',
  '血糖': 'bloodSugar',
  'GLU': 'bloodSugar',
  '葡萄糖': 'bloodSugar',
};

// 单位映射
const unitMap: Record<string, string> = {
  'μmol/L': 'μmol/L',
  'umol/L': 'μmol/L',
  'mmol/L': 'mmol/L',
  'g/L': 'g/L',
  'mg/dL': 'mg/dL',
  'kg': 'kg',
  'mmHg': 'mmHg',
  'ml': 'ml',
};

// 保存上传的图片
export async function saveImage(userId: string, imageUrl: string): Promise<string> {
  const report = await prisma.labReport.create({
    data: {
      userId,
      imageUrl,
      status: 'pending',
    },
  });

  return report.id;
}

// 模拟OCR识别（实际项目中调用百度AI或其他OCR服务）
export async function recognizeImage(imageId: string): Promise<OCRResult> {
  const report = await prisma.labReport.findUnique({
    where: { id: imageId },
  });

  if (!report) {
    throw new Error('图片不存在');
  }

  // 更新状态为处理中
  await prisma.labReport.update({
    where: { id: imageId },
    data: { status: 'processing' },
  });

  try {
    // TODO: 调用实际的OCR服务
    // 这里模拟OCR识别结果
    const mockResult: OCRResult = {
      success: true,
      rawText: '血清肌酐 180 μmol/L 参考范围 44-133\n尿素氮 12.5 mmol/L 参考范围 2.6-7.5\n血钾 5.2 mmol/L 参考范围 3.5-5.3',
      extracted: {
        creatinine: {
          value: 180,
          unit: 'μmol/L',
          confidence: 0.95,
          referenceRange: [44, 133],
        },
        urea: {
          value: 12.5,
          unit: 'mmol/L',
          confidence: 0.92,
          referenceRange: [2.6, 7.5],
        },
        potassium: {
          value: 5.2,
          unit: 'mmol/L',
          confidence: 0.88,
          referenceRange: [3.5, 5.3],
        },
      },
      lowConfidence: [],
      recordDate: new Date().toISOString().split('T')[0],
      hospital: '三甲医院',
    };

    // 更新报告状态
    await prisma.labReport.update({
      where: { id: imageId },
      data: {
        status: 'completed',
        ocrRawText: mockResult.rawText,
        ocrResult: mockResult.extracted as any,
        extractedData: Object.entries(mockResult.extracted).reduce(
          (acc, [key, data]) => ({ ...acc, [key]: data.value }),
          {}
        ),
        confidenceScores: Object.entries(mockResult.extracted).reduce(
          (acc, [key, data]) => ({ ...acc, [key]: data.confidence }),
          {}
        ),
        reportDate: mockResult.recordDate ? new Date(mockResult.recordDate) : null,
        hospital: mockResult.hospital,
      },
    });

    logger.info(`OCR识别完成: ${imageId}`);

    return mockResult;
  } catch (error) {
    // 更新状态为失败
    await prisma.labReport.update({
      where: { id: imageId },
      data: { status: 'failed' },
    });

    throw error;
  }
}

// 确认并保存OCR结果
export async function confirmOCRResult(
  userId: string,
  imageId: string,
  data: {
    recordDate: string;
    extractedData: Record<string, number>;
    notes?: string;
  }
) {
  const report = await prisma.labReport.findFirst({
    where: { id: imageId, userId },
  });

  if (!report) {
    throw new Error('图片不存在');
  }

  // 创建健康记录
  const healthRecord = await prisma.healthRecord.create({
    data: {
      userId,
      recordDate: new Date(data.recordDate),
      creatinine: data.extractedData.creatinine,
      urea: data.extractedData.urea,
      potassium: data.extractedData.potassium,
      sodium: data.extractedData.sodium,
      phosphorus: data.extractedData.phosphorus,
      uricAcid: data.extractedData.uricAcid,
      hemoglobin: data.extractedData.hemoglobin,
      bloodSugar: data.extractedData.bloodSugar,
      notes: data.notes,
      source: 'ocr',
    },
  });

  // 更新报告关联
  await prisma.labReport.update({
    where: { id: imageId },
    data: {
      healthRecordId: healthRecord.id,
      extractedData: data.extractedData as any,
    },
  });

  logger.info(`OCR结果已确认并保存: ${healthRecord.id}`);

  return {
    recordId: healthRecord.id,
    recordDate: healthRecord.recordDate.toISOString().split('T')[0],
  };
}

// 获取OCR结果
export async function getOCRResult(userId: string, imageId: string) {
  const report = await prisma.labReport.findFirst({
    where: { id: imageId, userId },
  });

  if (!report) {
    throw new Error('图片不存在');
  }

  return {
    imageId: report.id,
    imageUrl: report.imageUrl,
    status: report.status,
    ocrResult: report.ocrResult,
    extractedData: report.extractedData,
    confidenceScores: report.confidenceScores,
    reportDate: report.reportDate?.toISOString().split('T')[0],
    hospital: report.hospital,
  };
}
