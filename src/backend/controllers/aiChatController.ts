/**
 * AI 对话控制器
 * @version 1.0.0
 * @description 处理 AI 对话请求和历史记录管理
 */

import { Request, Response } from 'express';
import { aiChatService } from '../services/aiChatService';
import { nlpParser } from '../services/nlpParser';

/**
 * POST /ai/chat
 * AI 对话接口
 */
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message } = req.body;
    const userId = req.user?.id; // 假设通过认证中间件注入用户信息

    if (!message) {
      res.status(400).json({
        code: 400,
        message: '请输入咨询内容',
        data: null,
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '请先登录',
        data: null,
      });
      return;
    }

    // 处理用户查询
    const response = await aiChatService.processQuery(userId, message);

    // 构建响应
    const responseData = {
      content: response.content,
      type: response.type,
      urgency: response.urgency,
      disclaimer: response.disclaimer,
      suggestedActions: response.suggestedActions,
      referencedMetrics: response.referencedMetrics,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      code: 200,
      message: 'success',
      data: responseData,
    });
  } catch (error) {
    console.error('AI 对话处理失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务暂时不可用，请稍后重试',
      data: null,
    });
  }
}

/**
 * POST /ai/chat/quick
 * 快速咨询接口（用于常见问题的快速回复）
 */
export async function quickChat(req: Request, res: Response): Promise<void> {
  try {
    const { type, data } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '请先登录',
        data: null,
      });
      return;
    }

    let response;

    switch (type) {
      case 'metric_interpretation':
        // 快速指标解读
        if (!data.metric || data.value === undefined) {
          res.status(400).json({
            code: 400,
            message: '请提供指标名称和数值',
            data: null,
          });
          return;
        }
        response = await aiChatService.processQuery(
          userId,
          `我的${data.metric}是${data.value}${data.unit || ''}，正常吗？`
        );
        break;

      case 'diet_advice':
        // 快速饮食建议
        response = await aiChatService.processQuery(userId, '肾友应该吃什么？');
        break;

      case 'medication_reminder':
        // 用药提醒咨询
        response = await aiChatService.processQuery(
          userId,
          `我正在服用${data.medication || '免疫抑制剂'}，有什么注意事项？`
        );
        break;

      default:
        res.status(400).json({
          code: 400,
          message: '不支持的咨询类型',
          data: null,
        });
        return;
    }

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        content: response.content,
        type: response.type,
        urgency: response.urgency,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('快速咨询处理失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务暂时不可用，请稍后重试',
      data: null,
    });
  }
}

/**
 * GET /ai/chat/history
 * 获取对话历史
 */
export async function getChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '请先登录',
        data: null,
      });
      return;
    }

    const history = aiChatService.getChatHistory(userId, limit);

    res.status(200).json({
      code: 200,
      message: 'success',
      data: {
        messages: history.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          type: msg.metadata?.type,
          urgency: msg.metadata?.urgency,
        })),
        total: history.length,
      },
    });
  } catch (error) {
    console.error('获取对话历史失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败，请稍后重试',
      data: null,
    });
  }
}

/**
 * DELETE /ai/chat/history
 * 清除对话历史
 */
export async function clearChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '请先登录',
        data: null,
      });
      return;
    }

    aiChatService.clearChatHistory(userId);

    res.status(200).json({
      code: 200,
      message: '对话历史已清除',
      data: null,
    });
  } catch (error) {
    console.error('清除对话历史失败:', error);
    res.status(500).json({
      code: 500,
      message: '清除失败，请稍后重试',
      data: null,
    });
  }
}

/**
 * POST /ai/parse
 * 自然语言解析接口（用于前端智能输入）
 */
export async function parseNaturalLanguage(req: Request, res: Response): Promise<void> {
  try {
    const { text, type } = req.body;

    if (!text) {
      res.status(400).json({
        code: 400,
        message: '请输入要解析的文本',
        data: null,
      });
      return;
    }

    let result;

    switch (type) {
      case 'lab_report':
        result = nlpParser.parseLabReport(text);
        break;

      case 'health_query':
        result = nlpParser.parseHealthQuery(text);
        break;

      case 'drug_info':
        result = nlpParser.parseDrugInfo(text);
        break;

      default:
        // 自动检测类型
        const labResult = nlpParser.parseLabReport(text);
        if (labResult.success && labResult.confidence > 0.5) {
          result = { type: 'lab_report', ...labResult };
        } else {
          const drugResult = nlpParser.parseDrugInfo(text);
          if (drugResult.success) {
            result = { type: 'drug_info', ...drugResult };
          } else {
            result = {
              type: 'health_query',
              ...nlpParser.parseHealthQuery(text),
            };
          }
        }
    }

    res.status(200).json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error) {
    console.error('自然语言解析失败:', error);
    res.status(500).json({
      code: 500,
      message: '解析失败，请稍后重试',
      data: null,
    });
  }
}

/**
 * POST /ai/health-context
 * 更新用户健康数据上下文
 */
export async function updateHealthContext(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { lastHealthRecord, userProfile, recentDrugConcentrations } = req.body;

    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '请先登录',
        data: null,
      });
      return;
    }

    aiChatService.updateHealthContext(userId, {
      lastHealthRecord,
      userProfile,
      recentDrugConcentrations,
    });

    res.status(200).json({
      code: 200,
      message: '健康数据上下文已更新',
      data: null,
    });
  } catch (error) {
    console.error('更新健康上下文失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新失败，请稍后重试',
      data: null,
    });
  }
}

// 扩展 Express Request 类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
      };
    }
  }
}
