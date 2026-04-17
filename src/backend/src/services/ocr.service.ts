import prisma from '../config/database';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { recognizeText, imageFileToBase64, isOCRConfigValid } from '../utils/baiduOcr';
import path from 'path';
import fs from 'fs';

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
  '他克莫司': 'tacrolimus',
  'FK506': 'tacrolimus',
  'Tac': 'tacrolimus',
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
  'ng/mL': 'ng/mL',
  'ng/ml': 'ng/mL',
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
  // 检查OCR配置
  if (!isOCRConfigValid()) {
    throw new AppError('百度OCR配置不完整，请检查环境变量', 500, '00001');
  }

  const report = await prisma.labReport.findUnique({
    where: { id: imageId },
  });

  if (!report) {
    throw new AppError('图片不存在', 404, '00003');
  }

  // 更新状态为处理中
  await prisma.labReport.update({
    where: { id: imageId },
    data: { status: 'processing' },
  });

  try {
    // 1. 读取图片文件
    // imageUrl 可能是: uploads/ocr/xxx.jpg (相对路径) 或 https://example.com/xxx.jpg (URL)
    let imagePath: string;
    if (report.imageUrl.startsWith('http')) {
      // 外部URL，暂时不支持，需要下载
      throw new AppError('不支持外部URL图片，请重新上传', 400, '00002');
    } else if (report.imageUrl.startsWith('uploads/') || report.imageUrl.startsWith('./uploads/')) {
      // 相对路径
      imagePath = report.imageUrl.startsWith('./') ? report.imageUrl : `./${report.imageUrl}`;
    } else {
      // 可能是绝对路径或其他格式，直接使用
      imagePath = report.imageUrl;
    }

    if (!fs.existsSync(imagePath)) {
      throw new AppError(`图片文件不存在: ${imagePath}`, 404, '00003');
    }

    const imageBase64 = imageFileToBase64(imagePath);
    logger.info(`开始OCR识别: ${imageId}, 图片大小: ${(imageBase64.length / 1024).toFixed(1)}KB`);

    // 2. 调用百度OCR API
    const ocrResponse = await recognizeText(imageBase64);

    // 3. 解析OCR结果
    const rawText = ocrResponse.words_result.map(item => item.words).join('\n');
    logger.info(`OCR识别完成: ${imageId}, 识别到 ${ocrResponse.words_result_num} 行文字`);
    logger.debug(`OCR原始文本:\n${rawText}`);

    // 4. 提取健康指标
    const extracted = extractHealthMetrics(ocrResponse.words_result);

    // 5. 提取日期和医院信息
    const { date, hospital } = extractMetadata(ocrResponse.words_result);

    // 6. 检查低置信度项目
    const lowConfidence: string[] = [];
    Object.entries(extracted).forEach(([key, data]) => {
      if (data.confidence < 0.7) {
        lowConfidence.push(key);
      }
    });

    const result: OCRResult = {
      success: true,
      rawText,
      extracted,
      lowConfidence,
      recordDate: date || new Date().toISOString().split('T')[0],
      hospital: hospital || undefined,
    };

    // 7. 更新报告状态
    await prisma.labReport.update({
      where: { id: imageId },
      data: {
        status: 'completed',
        ocrRawText: result.rawText,
        ocrResult: result.extracted as any,
        extractedData: Object.entries(result.extracted).reduce(
          (acc, [key, data]) => ({ ...acc, [key]: data.value }),
          {}
        ),
        confidenceScores: Object.entries(result.extracted).reduce(
          (acc, [key, data]) => ({ ...acc, [key]: data.confidence }),
          {}
        ),
        reportDate: result.recordDate ? new Date(result.recordDate) : null,
        hospital: result.hospital,
      },
    });

    logger.info(`OCR识别完成: ${imageId}, 提取到 ${Object.keys(extracted).length} 个指标`);

    return result;
  } catch (error) {
    // 更新状态为失败
    await prisma.labReport.update({
      where: { id: imageId },
      data: { status: 'failed' },
    });

    logger.error(`OCR识别失败: ${imageId}`, error);
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
    throw new AppError('图片不存在', 404, '00003');
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
      tacrolimus: data.extractedData.tacrolimus,
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
    throw new AppError('图片不存在', 404, '00003');
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

// 默认单位映射
const defaultUnits: Record<string, string> = {
  creatinine: 'μmol/L',
  urea: 'mmol/L',
  potassium: 'mmol/L',
  sodium: 'mmol/L',
  phosphorus: 'mmol/L',
  uricAcid: 'μmol/L',
  hemoglobin: 'g/L',
  bloodSugar: 'mmol/L',
  tacrolimus: 'ng/mL',
};

// 从OCR结果中提取健康指标
function extractHealthMetrics(
  wordsResult: Array<{ words: string; probability?: { average: number } }>
): OCRResult['extracted'] {
  const extracted: OCRResult['extracted'] = {};

  // 合并所有文字，便于多行匹配
  const fullText = wordsResult.map(item => item.words).join(' ');
  const lines = wordsResult.map(item => item.words);

  logger.debug('OCR识别文本:\n' + lines.join('\n'));

  // 指标配置：名称别名和匹配模式
  const metricConfigs = [
    {
      key: 'creatinine',
      names: ['肌酐', '血清肌酐', 'Cr'],
      // 肌酐可能是 44-133 μmol/L 或 0.5-1.5 mg/dL
      valueRange: { min: 10, max: 2000 },
    },
    {
      key: 'urea',
      names: ['尿素氮', 'BUN', '尿素'],
      valueRange: { min: 0.5, max: 50 },
    },
    {
      key: 'potassium',
      names: ['钾', '血钾', 'K'],
      valueRange: { min: 1, max: 10 },
    },
    {
      key: 'sodium',
      names: ['钠', '血钠', 'Na'],
      valueRange: { min: 100, max: 200 },
    },
    {
      key: 'phosphorus',
      names: ['磷', '血磷', 'P'],
      valueRange: { min: 0.1, max: 5 },
    },
    {
      key: 'uricAcid',
      names: ['尿酸', 'UA'],
      valueRange: { min: 50, max: 1000 },
    },
    {
      key: 'hemoglobin',
      names: ['血红蛋白', 'Hb'],
      valueRange: { min: 20, max: 200 },
    },
    {
      key: 'bloodSugar',
      names: ['血糖', 'GLU', '葡萄糖'],
      valueRange: { min: 1, max: 35 },
    },
    {
      key: 'tacrolimus',
      names: ['他克莫司', 'FK506', 'Tac', 'TAC'],
      valueRange: { min: 0.1, max: 50 },
    },
  ];

  // 第一阶段：尝试在同一行匹配带单位的完整格式
  const patternsWithUnit = [
    { key: 'creatinine', pattern: /(?:肌酐|血清肌酐|Cr)[^\d]*(\d+\.?\d*)\s*(μmol\/L|umol\/L|mg\/dL)/i },
    { key: 'urea', pattern: /(?:尿素氮|尿素|BUN)[^\d]*(\d+\.?\d*)\s*(mmol\/L)/i },
    { key: 'potassium', pattern: /(?:钾|血钾|K\+?)[^\d]*(\d+\.?\d*)\s*(mmol\/L)/i },
    { key: 'sodium', pattern: /(?:钠|血钠|Na\+?)[^\d]*(\d+\.?\d*)\s*(mmol\/L)/i },
    { key: 'phosphorus', pattern: /(?:磷|血磷)[^\d]*(\d+\.?\d*)\s*(mmol\/L)/i },
    { key: 'uricAcid', pattern: /(?:尿酸|UA)[^\d]*(\d+\.?\d*)\s*(μmol\/L|umol\/L)/i },
    { key: 'hemoglobin', pattern: /(?:血红蛋白|Hb)[^\d]*(\d+\.?\d*)\s*(g\/L)/i },
    { key: 'bloodSugar', pattern: /(?:血糖|GLU|葡萄糖)[^\d]*(\d+\.?\d*)\s*(mmol\/L)/i },
    { key: 'tacrolimus', pattern: /(?:他克莫司|FK506|Tac|TAC)[^\d]*(\d+\.?\d*)\s*(ng\/mL|ng\/ml)/i },
  ];

  lines.forEach((line, index) => {
    patternsWithUnit.forEach(({ key, pattern }) => {
      if (extracted[key]) return;

      const match = line.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].replace('umol/L', 'μmol/L');
        const confidence = wordsResult[index]?.probability?.average ?? 0.9;

        extracted[key] = { value, unit, confidence };
        logger.debug(`[带单位] 提取到 ${key}: ${value} ${unit}`);
      }
    });
  });

  // 第二阶段：处理表格格式（指标名和数值分开列）
  // 查找包含指标名称的行，然后在同一行或下一行查找数值
  lines.forEach((line, index) => {
    metricConfigs.forEach(({ key, names, valueRange }) => {
      if (extracted[key]) return;

      // 检查当前行是否包含指标名称
      const hasName = names.some(name => line.includes(name));
      if (!hasName) return;

      // 在同一行查找数值（前面是指标名，后面是数值）
      // 匹配模式：指标名后跟任意非数字字符，然后是数字
      const valuePattern = new RegExp(`(?:${names.join('|')})[^\\d]*(\\d+\\.?\\d*)`);
      const match = line.match(valuePattern);

      if (match) {
        const value = parseFloat(match[1]);
        // 验证数值在合理范围内
        if (value >= valueRange.min && value <= valueRange.max) {
          const confidence = wordsResult[index]?.probability?.average ?? 0.8;
          extracted[key] = {
            value,
            unit: defaultUnits[key],
            confidence,
          };
          logger.debug(`[表格格式] 提取到 ${key}: ${value} ${defaultUnits[key]}`);
        }
      } else {
        // 尝试在下一行查找数值（某些格式指标名和数值分行显示）
        const nextLine = lines[index + 1];
        if (nextLine) {
          const numMatch = nextLine.match(/^(\d+\.?\d*)/);
          if (numMatch) {
            const value = parseFloat(numMatch[1]);
            if (value >= valueRange.min && value <= valueRange.max) {
              const confidence = wordsResult[index]?.probability?.average ?? 0.75;
              extracted[key] = {
                value,
                unit: defaultUnits[key],
                confidence,
              };
              logger.debug(`[多行格式] 提取到 ${key}: ${value} ${defaultUnits[key]}`);
            }
          }
        }
      }
    });
  });

  // 第三阶段：通用数值提取（如果前面没有匹配到）
  // 根据上下文推断指标类型
  lines.forEach((line, index) => {
    // 如果行中包含数字，且前面提到特定指标
    metricConfigs.forEach(({ key, names, valueRange }) => {
      if (extracted[key]) return;

      const hasName = names.some(name => line.includes(name));
      if (!hasName) return;

      // 查找行中的所有数字
      const numbers = line.match(/(\d+\.?\d*)/g);
      if (numbers && numbers.length > 0) {
        // 选择第一个在合理范围内的数字
        for (const numStr of numbers) {
          const value = parseFloat(numStr);
          if (value >= valueRange.min && value <= valueRange.max) {
            const confidence = wordsResult[index]?.probability?.average ?? 0.7;
            extracted[key] = {
              value,
              unit: defaultUnits[key],
              confidence,
            };
            logger.debug(`[通用格式] 提取到 ${key}: ${value} ${defaultUnits[key]}`);
            break;
          }
        }
      }
    });
  });

  return extracted;
}

// 提取元数据（日期、医院等）
function extractMetadata(
  wordsResult: Array<{ words: string }>
): { date?: string; hospital?: string } {
  const fullText = wordsResult.map(item => item.words).join(' ');

  // 提取日期（多种格式）
  const datePatterns = [
    /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
    /(\d{4})(\d{2})(\d{2})/,
    /(\d{2})[月/-](\d{1,2})[日/](\d{4})?/,
  ];

  let date: string | undefined;
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      if (match[0].includes('年')) {
        date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else if (match[3] && match[3].length === 4) {
        // MM/DD/YYYY 格式
        date = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      } else if (match[1].length === 4) {
        date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
      break;
    }
  }

  // 提取医院名称
  const hospitalPatterns = [
    /([\u4e00-\u9fa5]+(?:人民|协和|华西|中山|瑞金|华山|肿瘤|儿童|妇幼|骨科|眼科|口腔|胸科|肺科|精神|传染病|中西医结合|大学|军医|部队|海军|空军|陆军|火箭军|武警|公安|司法|监狱|劳改|铁路|交通|邮电|电力|水利|石油|化工|钢铁|煤炭|建筑|农林|农垦|牧场|渔场|林场|农场|牧场|渔场|林场)+(?:医院|卫生院|卫生室|诊所|医务室|卫生所|防治所|防治站|保健站|保健所|体检中心|检验中心|化验室))/,
    /([\u4e00-\u9fa5]+医院)/,
    /([\u4e00-\u9fa5]+卫生院)/,
    /([\u4e00-\u9fa5]+体检中心)/,
  ];

  let hospital: string | undefined;
  for (const pattern of hospitalPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      hospital = match[1];
      break;
    }
  }

  return { date, hospital };
}
