/**
 * AI 对话服务
 * @version 1.0.0
 * @description 提供智能健康咨询功能，包括指标解读、饮食建议、用药咨询、症状评估
 *
 * 重要提示：本服务提供的建议仅供参考，不能替代专业医疗诊断和治疗建议。
 */

import {
  HealthRecord,
  UserProfile,
  DrugConcentrationRecord,
  AlertLevel,
  METRIC_REFERENCE_RANGES,
  DRUG_REFERENCE_RANGES,
} from '../../shared/types';
import { nlpParser, NLPParser } from './nlpParser';

// 对话历史记录
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'metric_interpretation' | 'diet_advice' | 'medication_consultation' | 'symptom_assessment';
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
    referencedMetrics?: string[];
  };
}

// 对话上下文
interface ChatContext {
  userId: string;
  messages: ChatMessage[];
  lastHealthRecord?: HealthRecord;
  userProfile?: UserProfile;
  recentDrugConcentrations?: DrugConcentrationRecord[];
}

// AI 响应结果
interface AIResponse {
  content: string;
  type: 'metric_interpretation' | 'diet_advice' | 'medication_consultation' | 'symptom_assessment' | 'general';
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  disclaimer?: string;
  suggestedActions?: string[];
  referencedMetrics?: string[];
}

/**
 * AI 对话服务类
 */
export class AIChatService {
  private contexts: Map<string, ChatContext> = new Map();
  private readonly disclaimer: string =
    '【重要提示】以上建议仅供参考，不能替代专业医疗诊断和治疗。如有严重不适，请立即就医。';

  /**
   * 获取或创建对话上下文
   */
  getContext(userId: string): ChatContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        userId,
        messages: [],
      });
    }
    return this.contexts.get(userId)!;
  }

  /**
   * 更新用户健康数据上下文
   */
  updateHealthContext(
    userId: string,
    data: {
      lastHealthRecord?: HealthRecord;
      userProfile?: UserProfile;
      recentDrugConcentrations?: DrugConcentrationRecord[];
    }
  ): void {
    const context = this.getContext(userId);
    if (data.lastHealthRecord) context.lastHealthRecord = data.lastHealthRecord;
    if (data.userProfile) context.userProfile = data.userProfile;
    if (data.recentDrugConcentrations) context.recentDrugConcentrations = data.recentDrugConcentrations;
  }

  /**
   * 处理用户查询
   */
  async processQuery(userId: string, query: string): Promise<AIResponse> {
    const context = this.getContext(userId);

    // 1. 使用 NLP 解析用户意图
    const parsedQuery = nlpParser.parseHealthQuery(query);

    // 2. 根据意图生成响应
    let response: AIResponse;

    switch (parsedQuery.intent) {
      case 'metric_interpretation':
        response = this.generateMetricInterpretation(parsedQuery, context);
        break;
      case 'diet_advice':
        response = this.generateDietAdvice(parsedQuery, context);
        break;
      case 'medication_consultation':
        response = this.generateMedicationAdvice(parsedQuery, context);
        break;
      case 'symptom_assessment':
        response = this.generateSymptomAssessment(parsedQuery, context);
        break;
      default:
        response = this.generateGeneralResponse(query, context);
    }

    // 3. 记录对话历史
    this.addMessage(userId, 'user', query, {
      type: parsedQuery.intent,
      urgency: parsedQuery.urgency,
    });
    this.addMessage(userId, 'assistant', response.content, {
      type: response.type,
      urgency: response.urgency,
      referencedMetrics: response.referencedMetrics,
    });

    return response;
  }

  /**
   * 生成指标解读
   */
  private generateMetricInterpretation(
    parsedQuery: ReturnType<typeof nlpParser.parseHealthQuery>,
    context: ChatContext
  ): AIResponse {
    const { metric, value, unit } = parsedQuery;
    const record = context.lastHealthRecord;

    if (!metric || value === undefined) {
      return {
        content: '请提供具体的指标名称和数值，例如"肌酐180"或"血钾5.5"，我可以帮您分析。',
        type: 'metric_interpretation',
        urgency: 'low',
      };
    }

    // 获取参考范围
    const referenceRange = this.getReferenceRange(metric, context.userProfile?.gender);
    const status = this.evaluateMetricStatus(metric, value, referenceRange);

    let content = '';
    let urgency: AIResponse['urgency'] = 'low';
    const suggestedActions: string[] = [];

    // 根据指标和状态生成解读
    switch (metric) {
      case 'creatinine':
        content = this.interpretCreatinine(value, status, record);
        if (status === 'high') urgency = 'medium';
        if (value > 500) urgency = 'high';
        break;

      case 'potassium':
        content = this.interpretPotassium(value, status);
        if (value > 5.5) urgency = 'high';
        if (value > 6.0) urgency = 'emergency';
        if (value > 5.5) {
          suggestedActions.push('立即联系您的主治医生');
          suggestedActions.push('避免高钾食物（香蕉、橙子、土豆等）');
          suggestedActions.push('如血钾>6.0，请立即前往急诊');
        }
        break;

      case 'urea':
        content = this.interpretUrea(value, status);
        if (status === 'high') urgency = 'medium';
        break;

      case 'phosphorus':
        content = this.interpretPhosphorus(value, status);
        break;

      case 'uricAcid':
        content = this.interpretUricAcid(value, status, context.userProfile?.gender);
        break;

      case 'hemoglobin':
        content = this.interpretHemoglobin(value, status);
        break;

      case 'bloodSugar':
        content = this.interpretBloodSugar(value, status);
        break;

      default:
        content = `您的${this.getMetricName(metric)}为${value}${unit || ''}，${this.getStatusDescription(status)}。`;
    }

    // 添加趋势分析（如果有历史数据）
    if (record && (record as Record<string, unknown>)[metric] !== undefined) {
      const trend = this.analyzeTrend(metric, value, context);
      if (trend) {
        content += `\n\n${trend}`;
      }
    }

    return {
      content,
      type: 'metric_interpretation',
      urgency,
      disclaimer: urgency === 'emergency' || urgency === 'high' ? this.disclaimer : undefined,
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      referencedMetrics: [metric],
    };
  }

  /**
   * 生成饮食建议
   */
  private generateDietAdvice(
    parsedQuery: ReturnType<typeof nlpParser.parseHealthQuery>,
    context: ChatContext
  ): AIResponse {
    const record = context.lastHealthRecord;
    const profile = context.userProfile;

    let content = '';
    const recommendations: string[] = [];
    const restrictions: string[] = [];

    // 根据最新指标提供个性化建议
    if (record) {
      // 高钾血症饮食建议
      if (record.potassium && record.potassium > 5.0) {
        content += '根据您近期的血钾指标偏高，建议：\n';
        restrictions.push('避免高钾食物：香蕉、橙子、土豆、菠菜、西红柿');
        restrictions.push('蔬菜切小块浸泡后再烹饪，可减少钾含量');
        recommendations.push('可选择低钾水果：苹果、梨、蓝莓');
      }

      // 高磷血症饮食建议
      if (record.phosphorus && record.phosphorus > 1.45) {
        content += content ? '\n' : '';
        content += '您的血磷偏高，需要注意：\n';
        restrictions.push('限制奶制品、坚果、动物内脏的摄入');
        restrictions.push('避免含磷添加剂的加工食品');
        recommendations.push('烹饪时可用水煮，倒掉汤汁以减少磷含量');
      }

      // 高尿酸饮食建议
      if (record.uricAcid) {
        const threshold = profile?.gender === 'female' ? 357 : 416;
        if (record.uricAcid > threshold) {
          content += content ? '\n' : '';
          content += '您的尿酸偏高，建议：\n';
          restrictions.push('避免高嘌呤食物：动物内脏、海鲜、浓肉汤');
          restrictions.push('限制饮酒，尤其是啤酒');
          recommendations.push('多饮水，每日2000ml以上');
          recommendations.push('可适量食用低脂奶制品');
        }
      }

      // 贫血饮食建议
      if (record.hemoglobin && record.hemoglobin < 110) {
        content += content ? '\n' : '';
        content += '您的血红蛋白偏低，可以适当补充：\n';
        recommendations.push('富含铁的食物：瘦肉、动物肝脏、血制品');
        recommendations.push('配合维生素C丰富的食物，促进铁吸收');
        recommendations.push('遵医嘱服用铁剂或促红素');
      }
    }

    // 通用肾友饮食建议
    if (!content) {
      content = '作为肾衰竭患者，以下是通用的饮食建议：\n';
      recommendations.push('优质低蛋白饮食：选择鸡蛋、牛奶、瘦肉等优质蛋白');
      recommendations.push('控制盐分摄入：每日不超过5克');
      recommendations.push('适量饮水：根据尿量和透析情况调整');
      recommendations.push('保持营养均衡：适量补充维生素和矿物质');
    }

    // 组装建议内容
    if (recommendations.length > 0) {
      content += '\n【推荐食物】\n' + recommendations.map(r => `• ${r}`).join('\n');
    }
    if (restrictions.length > 0) {
      content += '\n\n【需要限制】\n' + restrictions.map(r => `• ${r}`).join('\n');
    }

    return {
      content,
      type: 'diet_advice',
      urgency: 'low',
      disclaimer: this.disclaimer,
    };
  }

  /**
   * 生成用药咨询建议
   */
  private generateMedicationAdvice(
    parsedQuery: ReturnType<typeof nlpParser.parseHealthQuery>,
    context: ChatContext
  ): AIResponse {
    const medications = parsedQuery.medications || [];
    const drugConcentrations = context.recentDrugConcentrations || [];

    let content = '';
    let urgency: AIResponse['urgency'] = 'low';
    const warnings: string[] = [];

    // 分析血药浓度
    if (drugConcentrations.length > 0) {
      const latest = drugConcentrations[drugConcentrations.length - 1];
      if (!latest.isInRange) {
        urgency = 'medium';
        if (latest.concentration > latest.referenceRange[1]) {
          content += `⚠️ 您的${latest.drugName}血药浓度为${latest.concentration}ng/mL，高于目标范围（${latest.referenceRange[0]}-${latest.referenceRange[1]}ng/mL）。\n\n`;
          warnings.push('血药浓度过高可能增加毒副作用风险');
          warnings.push('请勿自行调整剂量，请咨询主治医生');
        } else {
          content += `⚠️ 您的${latest.drugName}血药浓度为${latest.concentration}ng/mL，低于目标范围（${latest.referenceRange[0]}-${latest.referenceRange[1]}ng/mL）。\n\n`;
          warnings.push('血药浓度过低可能影响治疗效果');
          warnings.push('请确认是否按时服药，并咨询医生是否需要调整剂量');
        }
      } else {
        content += `✓ 您的${latest.drugName}血药浓度为${latest.concentration}ng/mL，在目标范围内。\n\n`;
      }
    }

    // 分析提到的药物
    if (medications.length > 0) {
      content += '关于您提到的药物：\n';
      for (const med of medications) {
        const advice = this.getMedicationAdvice(med);
        content += `\n【${med}】\n${advice}\n`;
      }
    }

    // 通用用药提醒
    content += '\n【用药注意事项】\n';
    content += '• 免疫抑制剂（环孢素/他克莫司等）需严格按时服用\n';
    content += '• 定期监测血药浓度，保持浓度在治疗窗内\n';
    content += '• 避免自行停药或调整剂量\n';
    content += '• 服药期间避免西柚汁（影响药物代谢）\n';
    content += '• 如有漏服，请咨询医生如何处理\n';

    if (warnings.length > 0) {
      content = `【重要提醒】\n${warnings.map(w => `⚠️ ${w}`).join('\n')}\n\n` + content;
    }

    return {
      content,
      type: 'medication_consultation',
      urgency,
      disclaimer: this.disclaimer,
    };
  }

  /**
   * 生成症状评估
   */
  private generateSymptomAssessment(
    parsedQuery: ReturnType<typeof nlpParser.parseHealthQuery>,
    context: ChatContext
  ): AIResponse {
    const symptoms = parsedQuery.symptoms || [];
    const urgency = parsedQuery.urgency;

    let content = '';
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 紧急情况
    if (urgency === 'emergency') {
      return {
        content: `🚨 **紧急情况** 🚨\n\n根据您描述的症状，可能存在严重健康风险。\n\n**请立即：**\n1. 拨打急救电话 120\n2. 或立即前往最近的医院急诊科\n3. 联系您的主治医生\n\n请不要等待，立即就医！`,
        type: 'symptom_assessment',
        urgency: 'emergency',
        disclaimer: '此评估基于您描述的症状，不能替代专业医疗诊断。',
        suggestedActions: ['立即拨打120', '前往急诊', '联系主治医生'],
      };
    }

    // 分析症状
    for (const symptom of symptoms) {
      switch (symptom) {
        case '水肿':
        case '浮肿':
          warnings.push('水肿可能是水分潴留或蛋白尿的表现');
          suggestions.push('记录每日体重变化');
          suggestions.push('限制盐分摄入');
          suggestions.push('如体重短期内增加>2kg，请及时就医');
          break;

        case '头晕':
        case '头痛':
          warnings.push('可能与血压异常或贫血有关');
          suggestions.push('测量血压并记录');
          suggestions.push('避免突然起身');
          break;

        case '恶心':
        case '呕吐':
          warnings.push('可能是尿毒症症状或药物副作用');
          suggestions.push('少量多餐，避免油腻食物');
          suggestions.push('如持续呕吐，请就医');
          break;

        case '少尿':
        case '无尿':
          warnings.push('尿量明显减少需要高度重视');
          suggestions.push('记录24小时尿量');
          suggestions.push('立即联系主治医生');
          break;

        case '皮肤瘙痒':
          warnings.push('可能与磷代谢紊乱或尿毒症有关');
          suggestions.push('保持皮肤湿润');
          suggestions.push('避免抓挠');
          suggestions.push('检查血磷水平');
          break;
      }
    }

    // 组装内容
    if (warnings.length > 0) {
      content += '【可能原因】\n' + warnings.map(w => `• ${w}`).join('\n') + '\n\n';
    }

    if (suggestions.length > 0) {
      content += '【建议措施】\n' + suggestions.map(s => `• ${s}`).join('\n') + '\n\n';
    }

    content += '如果症状持续或加重，请及时就医。';

    return {
      content,
      type: 'symptom_assessment',
      urgency,
      disclaimer: this.disclaimer,
      suggestedActions: urgency === 'high' ? ['联系主治医生', '尽快就医复查'] : undefined,
    };
  }

  /**
   * 生成通用响应
   */
  private generateGeneralResponse(query: string, context: ChatContext): AIResponse {
    const content = `您好！我是您的健康助手。\n\n我可以帮您：\n• 解读化验指标（如"肌酐180正常吗"）\n• 提供饮食建议（如"肾友应该吃什么"）\n• 用药咨询（如"环孢素有什么注意事项"）\n• 症状评估（如"最近感觉乏力是怎么回事"）\n\n请问有什么可以帮助您的吗？`;

    return {
      content,
      type: 'general',
      urgency: 'low',
    };
  }

  /**
   * 添加消息到历史记录
   */
  private addMessage(
    userId: string,
    role: ChatMessage['role'],
    content: string,
    metadata?: ChatMessage['metadata']
  ): void {
    const context = this.getContext(userId);
    context.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });

    // 限制历史记录长度（保留最近20条）
    if (context.messages.length > 20) {
      context.messages = context.messages.slice(-20);
    }
  }

  /**
   * 获取对话历史
   */
  getChatHistory(userId: string, limit = 10): ChatMessage[] {
    const context = this.getContext(userId);
    return context.messages.slice(-limit);
  }

  /**
   * 清除对话历史
   */
  clearChatHistory(userId: string): void {
    this.contexts.delete(userId);
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取指标参考范围
   */
  private getReferenceRange(metric: string, gender?: string): { min: number; max: number } | undefined {
    const ranges = METRIC_REFERENCE_RANGES.filter(r => r.metric === metric);
    if (ranges.length === 0) return undefined;

    // 尿酸根据性别区分
    if (metric === 'uricAcid' && gender) {
      const genderRange = ranges.find(r => r.gender === gender);
      if (genderRange) {
        return { min: genderRange.min || 0, max: genderRange.max || Infinity };
      }
    }

    const range = ranges[0];
    return { min: range.min || 0, max: range.max || Infinity };
  }

  /**
   * 评估指标状态
   */
  private evaluateMetricStatus(
    metric: string,
    value: number,
    referenceRange?: { min: number; max: number }
  ): 'normal' | 'high' | 'low' {
    if (!referenceRange) return 'normal';

    if (value > referenceRange.max) return 'high';
    if (value < referenceRange.min) return 'low';
    return 'normal';
  }

  /**
   * 获取指标中文名称
   */
  private getMetricName(metric: string): string {
    const names: { [key: string]: string } = {
      creatinine: '血清肌酐',
      urea: '尿素氮',
      potassium: '血钾',
      sodium: '血钠',
      phosphorus: '血磷',
      uricAcid: '尿酸',
      hemoglobin: '血红蛋白',
      bloodSugar: '血糖',
      weight: '体重',
    };
    return names[metric] || metric;
  }

  /**
   * 获取状态描述
   */
  private getStatusDescription(status: 'normal' | 'high' | 'low'): string {
    const descriptions = {
      normal: '在正常范围内',
      high: '偏高',
      low: '偏低',
    };
    return descriptions[status];
  }

  /**
   * 解读肌酐
   */
  private interpretCreatinine(value: number, status: string, record?: HealthRecord): string {
    let content = `您的血清肌酐为${value}μmol/L，`;

    if (status === 'normal') {
      content += '在正常范围内。肌酐是反映肾功能的重要指标，目前您的肾功能相对稳定。';
    } else if (status === 'high') {
      content += '高于正常范围。';
      if (value < 300) {
        content += '属于轻度升高，建议继续监测，注意饮食控制和规律作息。';
      } else if (value < 500) {
        content += '属于中度升高，建议尽快联系主治医生，评估是否需要调整治疗方案。';
      } else {
        content += '属于重度升高，请尽快就医，可能需要调整透析方案或进行其他治疗。';
      }
    }

    return content;
  }

  /**
   * 解读血钾
   */
  private interpretPotassium(value: number, status: string): string {
    let content = `您的血钾为${value}mmol/L，`;

    if (status === 'normal') {
      content += '在正常范围内。血钾控制良好，请继续保持。';
    } else if (status === 'high') {
      if (value > 6.0) {
        content = `⚠️ **紧急情况** ⚠️\n\n您的血钾为${value}mmol/L，属于**严重高钾血症**，可能导致心律失常甚至心脏骤停！\n\n**请立即：**\n1. 拨打急救电话 120\n2. 或立即前往急诊\n3. 同时联系您的主治医生\n\n在等待救治期间，避免任何含钾食物。`;
      } else if (value > 5.5) {
        content += '明显高于正常范围。高血钾可能影响心脏功能，建议：\n1. 立即联系主治医生\n2. 避免高钾食物（香蕉、橙子、土豆等）\n3. 复查血钾确认结果';
      } else {
        content += '轻度偏高。建议控制饮食中的钾摄入，并密切监测。';
      }
    } else {
      content += '低于正常范围。低血钾可能导致乏力、心律失常，请咨询医生是否需要补钾。';
    }

    return content;
  }

  /**
   * 解读尿素氮
   */
  private interpretUrea(value: number, status: string): string {
    let content = `您的尿素氮为${value}mmol/L，`;

    if (status === 'normal') {
      content += '在正常范围内。';
    } else if (status === 'high') {
      content += '高于正常范围。尿素氮升高通常与蛋白质代谢和肾功能有关，建议：\n• 控制蛋白质摄入（优质低蛋白饮食）\n• 保证充足热量摄入\n• 避免剧烈运动\n• 定期复查';
    } else {
      content += '低于正常范围。可能与蛋白质摄入不足有关，请咨询营养师。';
    }

    return content;
  }

  /**
   * 解读血磷
   */
  private interpretPhosphorus(value: number, status: string): string {
    let content = `您的血磷为${value}mmol/L，`;

    if (status === 'normal') {
      content += '在正常范围内。血磷控制良好。';
    } else if (status === 'high') {
      content += '高于正常范围。长期高磷血症可能导致骨病和血管钙化，建议：\n• 限制高磷食物（奶制品、坚果、动物内脏）\n• 按医嘱服用磷结合剂\n• 定期监测血磷水平';
    } else {
      content += '低于正常范围。请咨询医生是否需要调整治疗方案。';
    }

    return content;
  }

  /**
   * 解读尿酸
   */
  private interpretUricAcid(value: number, status: string, gender?: string): string {
    const threshold = gender === 'female' ? 357 : 416;
    let content = `您的尿酸为${value}μmol/L，`;

    if (status === 'normal') {
      content += '在正常范围内。';
    } else if (status === 'high') {
      content += `高于正常范围（${gender === 'female' ? '女性' : '男性'}参考值）。高尿酸可能引发痛风，建议：\n• 多饮水，每日2000ml以上\n• 避免高嘌呤食物（动物内脏、海鲜、浓肉汤）\n• 限制饮酒，特别是啤酒\n• 必要时遵医嘱服用降尿酸药物`;
    } else {
      content += '低于正常范围。';
    }

    return content;
  }

  /**
   * 解读血红蛋白
   */
  private interpretHemoglobin(value: number, status: string): string {
    let content = `您的血红蛋白为${value}g/L，`;

    if (status === 'normal') {
      content += '在正常范围内。';
    } else if (status === 'low') {
      content += '低于正常范围，提示存在贫血。肾性贫血是常见并发症，建议：\n• 遵医嘱使用促红细胞生成素（EPO）\n• 补充铁剂（如需要）\n• 摄入富含铁的食物（瘦肉、动物肝脏）\n• 定期监测血红蛋白';
    } else {
      content += '高于正常范围。请咨询医生。';
    }

    return content;
  }

  /**
   * 解读血糖
   */
  private interpretBloodSugar(value: number, status: string): string {
    let content = `您的血糖为${value}mmol/L，`;

    if (status === 'normal') {
      content += '在正常范围内。';
    } else if (status === 'high') {
      content += '高于正常范围。建议：\n• 控制饮食，减少精制糖摄入\n• 规律运动（根据身体状况）\n• 监测血糖变化\n• 必要时咨询内分泌科医生';
    } else {
      content += '低于正常范围。如感到头晕、出冷汗，请及时补充糖分。';
    }

    return content;
  }

  /**
   * 分析趋势
   */
  private analyzeTrend(metric: string, currentValue: number, context: ChatContext): string | null {
    // MVP 阶段简化实现，后续可接入真实历史数据对比
    return null;
  }

  /**
   * 获取药物建议
   */
  private getMedicationAdvice(medication: string): string {
    const adviceMap: { [key: string]: string } = {
      '环孢素': '• 需定期监测血药浓度（C0或C2）\n• 避免与西柚汁同服\n• 注意血压监测\n• 可能引起牙龈增生、多毛等副作用',
      '他克莫司': '• 需定期监测血药浓度\n• 空腹或餐前1小时或餐后2小时服用\n• 避免与西柚汁同服\n• 注意血糖监测（可能引起血糖升高）',
      '雷帕霉素': '• 需定期监测血药浓度\n• 可能引起血脂异常，需定期监测血脂\n• 伤口愈合可能延迟，手术前需告知医生',
      '泼尼松': '• 需遵医嘱逐渐减量，不可突然停药\n• 长期服用需补充钙剂和维生素D\n• 注意监测血压和血糖\n• 可能引起骨质疏松、体重增加',
      '呋塞米': '• 利尿剂，注意监测电解质（钾、钠）\n• 建议早晨服用，避免夜间频繁排尿\n• 注意体重和尿量变化',
    };

    return adviceMap[medication] || '• 请严格按医嘱服用\n• 如有不适及时就医\n• 定期复查相关指标';
  }
}

// 导出单例实例
export const aiChatService = new AIChatService();
export default AIChatService;
