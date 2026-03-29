/**
 * 自然语言解析器
 * @version 1.0.0
 * @description 解析用户输入的自然语言文本，提取医疗相关信息
 *
 * 支持功能：
 * 1. parseLabReport(text) - 解析化验单文本
 * 2. parseHealthQuery(text) - 解析用户健康咨询
 * 3. parseDrugInfo(text) - 解析用药相关信息
 */

import { HealthRecordFormData, DrugConcentrationFormData, DateString, ISODateTime } from '../../shared/types';

// 解析结果接口
interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence: number;
}

// 健康咨询解析结果
interface HealthQueryResult {
  intent: 'metric_interpretation' | 'diet_advice' | 'medication_consultation' | 'symptom_assessment' | 'general';
  metric?: string;
  value?: number;
  unit?: string;
  symptoms?: string[];
  medications?: string[];
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  rawText: string;
}

// 用药信息解析结果
interface DrugInfoResult {
  drugName: string;
  dosage?: number;
  dosageUnit?: string;
  frequency?: string;
  times?: string[];
  duration?: string;
  notes?: string;
}

/**
 * 自然语言解析器类
 */
export class NLPParser {
  // 指标关键词映射
  private metricKeywords: { [key: string]: string[] } = {
    creatinine: ['肌酐', 'CREA', 'Cr', '血清肌酐'],
    urea: ['尿素', '尿素氮', 'BUN'],
    potassium: ['钾', '血钾', 'K', 'K+'],
    sodium: ['钠', '血钠', 'Na', 'Na+'],
    phosphorus: ['磷', '血磷', 'P'],
    uricAcid: ['尿酸', 'UA', '血尿酸'],
    hemoglobin: ['血红蛋白', 'Hb', 'HGB'],
    bloodSugar: ['血糖', 'GLU', '葡萄糖'],
    weight: ['体重', 'Wt'],
    bloodPressure: ['血压', 'BP'],
    urineVolume: ['尿量'],
  };

  // 意图关键词映射
  private intentKeywords: { [key: string]: string[] } = {
    metric_interpretation: ['怎么看', '正常吗', '偏高', '偏低', '异常', '解读', '分析', '什么意思'],
    diet_advice: ['吃什么', '饮食', '食物', '忌口', '不能吃', '推荐', '建议'],
    medication_consultation: ['药', '药物', '吃药', '服用', '剂量', '副作用', '相互作用'],
    symptom_assessment: ['症状', '不舒服', '难受', '痛', '疼', '感觉', '头晕', '恶心', '呕吐'],
  };

  // 紧急症状关键词
  private emergencySymptoms: string[] = [
    '昏迷', '休克', '呼吸困难', '胸痛', '剧烈疼痛', '大出血',
    '抽搐', '意识模糊', '无法呼吸', '心脏骤停', '严重过敏',
    '血钾高', '血钾过高', '高钾血症', '血钾大于6', '血钾>6',
  ];

  // 高风险症状关键词
  private highRiskSymptoms: string[] = [
    '水肿', '呼吸困难', '心悸', '胸闷', '少尿', '无尿',
    '血尿', '发热', '寒战', '血压高', '血压升高',
    '血钾偏高', '血钾5.5', '血钾>5.5',
  ];

  /**
   * 解析化验单文本
   * 从非结构化的化验单文本中提取结构化指标数据
   */
  parseLabReport(text: string): ParseResult<Partial<HealthRecordFormData>> {
    try {
      const data: Partial<HealthRecordFormData> = {};
      let confidenceSum = 0;
      let fieldCount = 0;

      // 提取日期
      const dateMatch = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
      if (dateMatch) {
        data.recordDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` as DateString;
      } else {
        data.recordDate = new Date().toISOString().split('T')[0] as DateString;
      }

      // 提取各项指标
      const extractors: { [key: string]: () => number | undefined } = {
        creatinine: () => this.extractMetricValue(text, ['肌酐', 'CREA', 'Cr'], 'μmol/L'),
        urea: () => this.extractMetricValue(text, ['尿素', '尿素氮', 'BUN'], 'mmol/L'),
        potassium: () => this.extractMetricValue(text, ['钾', '血钾', 'K+'], 'mmol/L'),
        sodium: () => this.extractMetricValue(text, ['钠', '血钠', 'Na+'], 'mmol/L'),
        phosphorus: () => this.extractMetricValue(text, ['磷', '血磷'], 'mmol/L'),
        uricAcid: () => this.extractMetricValue(text, ['尿酸', 'UA'], 'μmol/L'),
        hemoglobin: () => this.extractMetricValue(text, ['血红蛋白', 'Hb', 'HGB'], 'g/L'),
        bloodSugar: () => this.extractMetricValue(text, ['血糖', 'GLU'], 'mmol/L'),
        weight: () => this.extractMetricValue(text, ['体重', 'Wt'], 'kg'),
        bloodPressureSystolic: () => this.extractBloodPressure(text, 'systolic'),
        bloodPressureDiastolic: () => this.extractBloodPressure(text, 'diastolic'),
        urineVolume: () => this.extractMetricValue(text, ['尿量'], 'ml'),
      };

      for (const [field, extractor] of Object.entries(extractors)) {
        const value = extractor();
        if (value !== undefined) {
          (data as Record<string, number>)[field] = value;
          confidenceSum += 0.9; // 每个成功提取的字段增加置信度
          fieldCount++;
        }
      }

      const confidence = fieldCount > 0 ? confidenceSum / fieldCount : 0;

      return {
        success: fieldCount > 0,
        data,
        confidence: Math.round(confidence * 100) / 100,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析失败',
        confidence: 0,
      };
    }
  }

  /**
   * 解析用户健康咨询
   * 识别用户意图、提取关键信息、评估紧急程度
   */
  parseHealthQuery(text: string): HealthQueryResult {
    const result: HealthQueryResult = {
      intent: 'general',
      urgency: 'low',
      rawText: text,
    };

    // 识别意图
    result.intent = this.detectIntent(text);

    // 提取指标信息
    const metricInfo = this.extractMetricFromQuery(text);
    if (metricInfo) {
      result.metric = metricInfo.metric;
      result.value = metricInfo.value;
      result.unit = metricInfo.unit;
    }

    // 提取症状
    result.symptoms = this.extractSymptoms(text);

    // 提取药物
    result.medications = this.extractMedications(text);

    // 评估紧急程度
    result.urgency = this.assessUrgency(text, result);

    return result;
  }

  /**
   * 解析用药相关信息
   * 从文本中提取药物名称、剂量、频次、时间等信息
   */
  parseDrugInfo(text: string): ParseResult<DrugInfoResult> {
    try {
      // 提取药物名称
      const drugName = this.extractDrugName(text);
      if (!drugName) {
        return {
          success: false,
          error: '未识别到药物名称',
          confidence: 0,
        };
      }

      const result: DrugInfoResult = {
        drugName,
        dosage: this.extractDosage(text),
        dosageUnit: this.extractDosageUnit(text),
        frequency: this.extractFrequency(text),
        times: this.extractMedicationTimes(text),
        duration: this.extractDuration(text),
        notes: this.extractNotes(text),
      };

      // 计算置信度
      let confidence = 0.5;
      if (result.dosage) confidence += 0.2;
      if (result.frequency) confidence += 0.15;
      if (result.times && result.times.length > 0) confidence += 0.15;

      return {
        success: true,
        data: result,
        confidence: Math.min(confidence, 1.0),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析失败',
        confidence: 0,
      };
    }
  }

  /**
   * 提取指标数值
   */
  private extractMetricValue(text: string, keywords: string[], defaultUnit: string): number | undefined {
    for (const keyword of keywords) {
      // 匹配格式：关键词 + 分隔符 + 数字 + 可选单位
      const pattern = new RegExp(`${keyword}[:：\\s]+([\\d.]+)`, 'i');
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }

      // 匹配表格格式
      const tablePattern = new RegExp(`${keyword}\\s+([\\d.]+)`, 'i');
      const tableMatch = text.match(tablePattern);
      if (tableMatch) {
        const value = parseFloat(tableMatch[1]);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
    return undefined;
  }

  /**
   * 提取血压值
   */
  private extractBloodPressure(text: string, type: 'systolic' | 'diastolic'): number | undefined {
    // 匹配格式：120/80 或 血压 120/80
    const pattern = /血压[:：\s]*(\d+)\s*\/\s*(\d+)/i;
    const match = text.match(pattern);
    if (match) {
      if (type === 'systolic') {
        return parseInt(match[1], 10);
      } else {
        return parseInt(match[2], 10);
      }
    }
    return undefined;
  }

  /**
   * 检测用户意图
   */
  private detectIntent(text: string): HealthQueryResult['intent'] {
    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return intent as HealthQueryResult['intent'];
        }
      }
    }
    return 'general';
  }

  /**
   * 从查询中提取指标信息
   */
  private extractMetricFromQuery(text: string): { metric: string; value: number; unit: string } | null {
    for (const [metric, keywords] of Object.entries(this.metricKeywords)) {
      for (const keyword of keywords) {
        // 匹配格式：肌酐180、血钾5.5等
        const pattern = new RegExp(`${keyword}\\s*[:：]?\\s*([\\d.]+)\\s*([a-zA-Zµμ/\\u4e00-\\u9fa5]+)?`, 'i');
        const match = text.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (!isNaN(value)) {
            return {
              metric,
              value,
              unit: match[2] || this.getDefaultUnit(metric),
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * 提取症状列表
   */
  private extractSymptoms(text: string): string[] {
    const symptoms: string[] = [];
    const symptomPatterns = [
      '头晕', '头痛', '恶心', '呕吐', '乏力', '疲劳', '胸闷', '心悸',
      '气短', '呼吸困难', '水肿', '浮肿', '少尿', '无尿', '血尿',
      '腰痛', '背痛', '腹痛', '食欲不振', '失眠', '皮肤瘙痒',
    ];

    for (const symptom of symptomPatterns) {
      if (text.includes(symptom)) {
        symptoms.push(symptom);
      }
    }

    return symptoms;
  }

  /**
   * 提取药物列表
   */
  private extractMedications(text: string): string[] {
    const medications: string[] = [];
    const medicationPatterns = [
      '环孢素', '他克莫司', '雷帕霉素', 'FK506', 'CsA',
      '泼尼松', '甲泼尼龙', '呋塞米', '螺内酯',
      '碳酸钙', '骨化三醇', '促红素', '降压药',
    ];

    for (const med of medicationPatterns) {
      if (text.includes(med)) {
        medications.push(med);
      }
    }

    return medications;
  }

  /**
   * 评估紧急程度
   */
  private assessUrgency(text: string, queryResult: HealthQueryResult): HealthQueryResult['urgency'] {
    // 检查紧急症状
    for (const symptom of this.emergencySymptoms) {
      if (text.includes(symptom)) {
        return 'emergency';
      }
    }

    // 检查血钾异常（高钾血症是肾衰竭患者的紧急情况）
    if (queryResult.metric === 'potassium' && queryResult.value !== undefined) {
      if (queryResult.value > 6.0) {
        return 'emergency';
      }
      if (queryResult.value > 5.5) {
        return 'high';
      }
    }

    // 检查高风险症状
    for (const symptom of this.highRiskSymptoms) {
      if (text.includes(symptom)) {
        return 'high';
      }
    }

    // 检查肌酐急剧升高
    if (queryResult.metric === 'creatinine' && queryResult.value !== undefined) {
      if (queryResult.value > 500) {
        return 'high';
      }
    }

    return 'low';
  }

  /**
   * 提取药物名称
   */
  private extractDrugName(text: string): string | undefined {
    const patterns = [
      /(?:吃|服用|用了|用)[了过]?([\u4e00-\u9fa5]+(?:素|松|醇|片|胶囊|颗粒))/,
      /([\u4e00-\u9fa5]+(?:素|松|醇|片|胶囊|颗粒))/,
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
   * 提取剂量
   */
  private extractDosage(text: string): number | undefined {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:mg|g|粒|片|粒|支|瓶)/i,
      /(?:每次|一次|一日)\s*(\d+(?:\.\d+)?)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * 提取剂量单位
   */
  private extractDosageUnit(text: string): string | undefined {
    const patterns = [
      /\d+(?:\.\d+)?\s*(mg|g|粒|片|粒|支|瓶)/i,
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
   * 提取用药频次
   */
  private extractFrequency(text: string): string | undefined {
    const frequencyMap: { [key: string]: string } = {
      '每天一次': 'once_daily',
      '每日一次': 'once_daily',
      '一天一次': 'once_daily',
      '每天两次': 'twice_daily',
      '每日两次': 'twice_daily',
      '一天两次': 'twice_daily',
      'bid': 'twice_daily',
      '每天三次': 'three_daily',
      '每日三次': 'three_daily',
      '一天三次': 'three_daily',
      'tid': 'three_daily',
      '隔日一次': 'every_other_day',
      '每周一次': 'weekly',
    };

    for (const [chinese, english] of Object.entries(frequencyMap)) {
      if (text.includes(chinese)) {
        return english;
      }
    }

    return undefined;
  }

  /**
   * 提取用药时间
   */
  private extractMedicationTimes(text: string): string[] | undefined {
    const times: string[] = [];
    const timePattern = /(\d{1,2}):(\d{2})/g;
    let match;

    while ((match = timePattern.exec(text)) !== null) {
      const hour = match[1].padStart(2, '0');
      const minute = match[2];
      times.push(`${hour}:${minute}`);
    }

    // 如果没有匹配到具体时间，尝试匹配描述性时间
    if (times.length === 0) {
      if (text.includes('早上') || text.includes('早晨') || text.includes('上午')) {
        times.push('08:00');
      }
      if (text.includes('中午')) {
        times.push('12:00');
      }
      if (text.includes('晚上') || text.includes('睡前')) {
        times.push('20:00');
      }
    }

    return times.length > 0 ? times : undefined;
  }

  /**
   * 提取用药疗程
   */
  private extractDuration(text: string): string | undefined {
    const patterns = [
      /(?:服用|用|吃)(\d+)(?:天|日|周|个月)/,
      /疗程(\d+)(?:天|日|周|个月)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * 提取备注信息
   */
  private extractNotes(text: string): string | undefined {
    const patterns = [
      /(?:备注|注意|说明)[:：]\s*(.+)/,
      /(?:饭后|饭前|随餐|空腹).{0,10}/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return undefined;
  }

  /**
   * 获取默认单位
   */
  private getDefaultUnit(metric: string): string {
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
    };
    return defaults[metric] || '';
  }
}

// 导出单例实例
export const nlpParser = new NLPParser();
export default NLPParser;
