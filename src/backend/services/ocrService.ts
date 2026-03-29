/**
 * OCR 化验单识别服务
 * @version 1.0.0
 * @description 集成 OCR 服务，实现化验单图片到结构化数据的解析
 *
 * MVP 阶段使用模拟数据实现接口，后续可接入真实 OCR 服务（如百度AI、腾讯云等）
 */

import { OCRResult, OCRUploadResult, HealthRecordFormData, DateString } from '../../shared/types';

// OCR 识别响应接口
interface OCRRecognitionResponse {
  imageId: string;
  success: boolean;
  rawText: string;
  extracted: OCRResult['extracted'];
  lowConfidence: string[];
  recordDate?: DateString;
  hospital?: string;
}

// 百度 OCR API 响应格式（预留）
interface BaiduOCRResponse {
  log_id: number;
  words_result_num: number;
  words_result: Array<{
    words: string;
    location: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;
}

/**
 * OCR 服务类
 */
export class OCRService {
  private apiUrl: string;
  private accessToken: string;

  constructor() {
    // 从环境变量读取配置，MVP 阶段使用模拟数据
    this.apiUrl = process.env.BAIDU_OCR_API_URL || 'https://aip.baidubce.com/rest/2.0/ocr/v1/medical_report';
    this.accessToken = process.env.BAIDU_OCR_ACCESS_TOKEN || '';
  }

  /**
   * 识别化验单图片（Base64）
   * MVP 阶段返回模拟数据
   */
  async recognize(imageBase64: string): Promise<OCRRecognitionResponse> {
    // MVP 阶段：模拟识别结果
    // 后续接入真实 OCR 服务时，取消下面的模拟代码

    /*
    // 真实实现：调用百度 OCR API
    const params = new URLSearchParams();
    params.append('image', imageBase64);
    params.append('detect_direction', 'true');

    const response = await fetch(
      `${this.apiUrl}?access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    const result: BaiduOCRResponse = await response.json();
    const rawText = result.words_result.map(w => w.words).join('\n');
    */

    // 模拟：生成随机识别结果
    const mockResult = this.generateMockResult();
    return mockResult;
  }

  /**
   * 从 URL 识别图片
   */
  async recognizeFromUrl(imageUrl: string): Promise<OCRRecognitionResponse> {
    // MVP 阶段：模拟识别结果
    return this.generateMockResult();
  }

  /**
   * 生成模拟识别结果（用于 MVP 测试）
   */
  private generateMockResult(): OCRRecognitionResponse {
    const today = new Date().toISOString().split('T')[0] as DateString;

    return {
      imageId: `ocr_${Date.now()}`,
      success: true,
      rawText: `血清肌酐 180 μmol/L 参考范围 44-133
尿素氮 12.5 mmol/L 参考范围 2.6-7.5
血钾 5.2 mmol/L 参考范围 3.5-5.3
血钠 140 mmol/L 参考范围 136-145
血磷 1.8 mmol/L 参考范围 0.87-1.45
尿酸 420 μmol/L 参考范围 150-416
血红蛋白 105 g/L 参考范围 120-160
血糖 5.8 mmol/L 参考范围 3.9-6.1`,
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
        sodium: {
          value: 140,
          unit: 'mmol/L',
          confidence: 0.94,
          referenceRange: [136, 145],
        },
        phosphorus: {
          value: 1.8,
          unit: 'mmol/L',
          confidence: 0.85,
          referenceRange: [0.87, 1.45],
        },
        uricAcid: {
          value: 420,
          unit: 'μmol/L',
          confidence: 0.91,
          referenceRange: [150, 416],
        },
        hemoglobin: {
          value: 105,
          unit: 'g/L',
          confidence: 0.93,
          referenceRange: [120, 160],
        },
        bloodSugar: {
          value: 5.8,
          unit: 'mmol/L',
          confidence: 0.90,
          referenceRange: [3.9, 6.1],
        },
      },
      lowConfidence: ['phosphorus'],
      recordDate: today,
      hospital: '三甲医院',
    };
  }

  /**
   * 计算置信度评分
   * 基于多种因素评估识别结果的可信度
   */
  calculateConfidenceScore(extracted: OCRResult['extracted']): number {
    const confidences = Object.values(extracted).map(item => item.confidence);
    if (confidences.length === 0) return 0;

    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * 获取低置信度字段列表
   */
  getLowConfidenceFields(extracted: OCRResult['extracted'], threshold = 0.8): string[] {
    return Object.entries(extracted)
      .filter(([_, item]) => item.confidence < threshold)
      .map(([key, _]) => key);
  }
}

/**
 * 化验单解析器
 * 从 OCR 原始文本中提取结构化指标数据
 */
export class LabReportParser {
  // 指标关键词映射表（支持多种写法）
  private keywordMap: { [key: string]: string[] } = {
    creatinine: ['肌酐', 'CREA', 'Cr', '肌酸酐', '血清肌酐', '血肌酐'],
    urea: ['尿素', '尿素氮', 'BUN', 'Urea', '血尿素氮'],
    potassium: ['钾', 'K', 'K+', 'Potassium', '血钾', '血清钾'],
    sodium: ['钠', 'Na', 'Na+', 'Sodium', '血钠'],
    phosphorus: ['磷', 'P', 'Phosphorus', '血磷', '无机磷'],
    uricAcid: ['尿酸', 'UA', 'Uric Acid', '血尿酸', '尿酸(UA)'],
    hemoglobin: ['血红蛋白', 'Hb', 'HGB', 'Hemoglobin'],
    bloodSugar: ['血糖', 'GLU', 'Glucose', '葡萄糖'],
    weight: ['体重', 'Wt', 'Weight', '体质量'],
    bloodPressureSystolic: ['收缩压', '高压', 'SBP'],
    bloodPressureDiastolic: ['舒张压', '低压', 'DBP'],
    urineVolume: ['尿量', '尿量/24h', '24小时尿量'],
    drugConcentration: ['血药浓度', '药物浓度', '环孢素', '他克莫司', '雷帕霉素', 'FK506', 'CsA'],
  };

  // 单位标准化映射
  private unitMap: { [key: string]: string } = {
    'umol/l': 'μmol/L',
    'µmol/l': 'μmol/L',
    'mmol/l': 'mmol/L',
    'mg/dl': 'mg/dL',
    'mg/l': 'mg/L',
    'g/l': 'g/L',
    'kg': 'kg',
    'g': 'g',
    'ng/ml': 'ng/mL',
    'ng/ml': 'ng/mL',
    'μg/l': 'μg/L',
    'ug/l': 'μg/L',
    'mmhg': 'mmHg',
    'ml': 'mL',
    'ml/min': 'mL/min',
  };

  // 参考范围映射
  private referenceRangeMap: { [key: string]: [number, number] } = {
    creatinine: [44, 133],
    urea: [2.6, 7.5],
    potassium: [3.5, 5.3],
    sodium: [136, 145],
    phosphorus: [0.87, 1.45],
    uricAcid: [150, 416], // 男性，女性为 [89, 357]
    hemoglobin: [120, 160],
    bloodSugar: [3.9, 6.1],
    bloodPressureSystolic: [90, 140],
    bloodPressureDiastolic: [60, 90],
  };

  /**
   * 解析 OCR 原始文本
   */
  parse(ocrText: string): OCRResult {
    const extracted: OCRResult['extracted'] = {};
    const lowConfidence: string[] = [];

    for (const [field, keywords] of Object.entries(this.keywordMap)) {
      for (const keyword of keywords) {
        const metric = this.extractValue(ocrText, keyword, field);
        if (metric) {
          extracted[field] = metric;

          // 置信度低于 0.8 标记为低置信度
          if (metric.confidence < 0.8) {
            lowConfidence.push(field);
          }
          break;
        }
      }
    }

    return {
      success: Object.keys(extracted).length > 0,
      rawText: ocrText,
      extracted,
      lowConfidence,
      recordDate: this.extractDate(ocrText),
      hospital: this.extractHospital(ocrText),
    };
  }

  /**
   * 从文本中提取单个指标值
   */
  private extractValue(
    text: string,
    keyword: string,
    field: string
  ): { value: number; unit: string; confidence: number; referenceRange?: [number, number] } | null {
    // 支持多种格式：
    // 1. 肌酐: 120 μmol/L
    // 2. 肌酐 120
    // 3. 肌酐 120 (44-133)
    // 4. 肌酐 120 参考范围 44-133

    const patterns = [
      // 格式1：关键词 + 分隔符 + 数字 + 单位
      new RegExp(`${keyword}[:：\\s]+([\\d.]+)\\s*([a-zA-Zµμ/\\u4e00-\\u9fa5]+)?`, 'i'),
      // 格式2：关键词 + 空格 + 数字
      new RegExp(`${keyword}\\s+([\\d.]+)`, 'i'),
      // 格式3：带参考范围的格式
      new RegExp(`${keyword}[:：\\s]+([\\d.]+).*?[(（]([\\d.-]+)[)）]`, 'i'),
      // 格式4：表格格式（关键词在前或在后）
      new RegExp(`([\\d.]+)\\s*([a-zA-Zµμ/\\u4e00-\\u9fa5]+)?.*?${keyword}`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        let unit = match[2] || this.getDefaultUnit(field);
        unit = this.normalizeUnit(unit);

        // 计算置信度
        const confidence = this.calculateConfidence(match, text, field, value);

        // 合理性检查
        if (this.isReasonableValue(field, value)) {
          return {
            value,
            unit,
            confidence,
            referenceRange: this.referenceRangeMap[field],
          };
        }
      }
    }

    return null;
  }

  /**
   * 标准化单位
   */
  private normalizeUnit(unit: string): string {
    const lowerUnit = unit.toLowerCase().replace(/\s/g, '');
    return this.unitMap[lowerUnit] || unit;
  }

  /**
   * 获取默认单位
   */
  private getDefaultUnit(field: string): string {
    const defaults: { [key: string]: string } = {
      creatinine: 'μmol/L',
      urea: 'mmol/L',
      potassium: 'mmol/L',
      sodium: 'mmol/L',
      phosphorus: 'mmol/L',
      uricAcid: 'μmol/L',
      hemoglobin: 'g/L',
      bloodSugar: 'mmol/L',
      weight: 'kg',
      bloodPressureSystolic: 'mmHg',
      bloodPressureDiastolic: 'mmHg',
      urineVolume: 'mL',
      drugConcentration: 'ng/mL',
    };
    return defaults[field] || '';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    match: RegExpMatchArray,
    text: string,
    field: string,
    value: number
  ): number {
    let confidence = 0.5;

    // 有明确的单位增加置信度
    if (match[2]) confidence += 0.2;

    // 匹配位置靠前增加置信度（通常指标名在左侧）
    if (match.index && match.index < text.length / 2) confidence += 0.1;

    // 数值格式合理增加置信度
    if (/^\d+(\.\d{1,2})?$/.test(match[1])) confidence += 0.1;

    // 数值在合理范围内增加置信度
    if (this.isInNormalRange(field, value)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * 合理性检查
   */
  private isReasonableValue(field: string, value: number): boolean {
    const ranges: { [key: string]: [number, number] } = {
      creatinine: [10, 2000],
      urea: [0.5, 100],
      potassium: [1, 10],
      sodium: [100, 200],
      phosphorus: [0.1, 5],
      uricAcid: [50, 1000],
      hemoglobin: [50, 200],
      bloodSugar: [1, 30],
      weight: [20, 300],
      bloodPressureSystolic: [70, 250],
      bloodPressureDiastolic: [40, 150],
      urineVolume: [0, 5000],
      drugConcentration: [0, 5000],
    };

    const range = ranges[field];
    if (!range) return true;

    return value >= range[0] && value <= range[1];
  }

  /**
   * 检查数值是否在正常范围内
   */
  private isInNormalRange(field: string, value: number): boolean {
    const range = this.referenceRangeMap[field];
    if (!range) return true;
    return value >= range[0] && value <= range[1];
  }

  /**
   * 提取日期
   */
  private extractDate(text: string): DateString | undefined {
    // 匹配常见日期格式
    const patterns = [
      /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,
      /(\d{4})(\d{2})(\d{2})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}-${month}-${day}` as DateString;
      }
    }

    return undefined;
  }

  /**
   * 提取医院名称
   */
  private extractHospital(text: string): string | undefined {
    const patterns = [
      /([\u4e00-\u9fa5]+医院)/,
      /([\u4e00-\u9fa5]+体检中心)/,
      /([\u4e00-\u9fa5]+卫生院)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * 解析药物信息
   */
  parseDrugInfo(text: string): { drugType: string; samplingTime: string; drugName: string; concentration: number } | null {
    // 环孢素 / Cyclosporine / CsA
    if (/环孢素|Cyclosporine|CsA/i.test(text)) {
      const samplingTime = /C2|服药后2小时|2h/i.test(text) ? 'C2' : 'C0';
      const concentration = this.extractDrugConcentration(text);
      return { drugType: 'cyclosporine', samplingTime, drugName: '环孢素', concentration };
    }
    // 他克莫司 / Tacrolimus / FK506
    if (/他克莫司|Tacrolimus|FK506/i.test(text)) {
      const concentration = this.extractDrugConcentration(text);
      return { drugType: 'tacrolimus', samplingTime: 'C0', drugName: '他克莫司', concentration };
    }
    // 雷帕霉素 / Sirolimus
    if (/雷帕霉素|西罗莫司|Sirolimus/i.test(text)) {
      const concentration = this.extractDrugConcentration(text);
      return { drugType: 'sirolimus', samplingTime: 'C0', drugName: '雷帕霉素', concentration };
    }
    return null;
  }

  /**
   * 提取药物浓度值
   */
  private extractDrugConcentration(text: string): number {
    const pattern = /(\d+(?:\.\d+)?)\s*(?:ng\/mL|ng\/ml|μg\/L|ug\/L)/i;
    const match = text.match(pattern);
    return match ? parseFloat(match[1]) : 0;
  }
}

// 导出单例实例
export const ocrService = new OCRService();
export const labReportParser = new LabReportParser();
