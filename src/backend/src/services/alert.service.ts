import prisma from '../config/database';
import { AlertLevel, AlertType, HealthRecord, DrugConcentrationRecord, MedicationLog } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

// 预警规则定义
interface AlertRule {
  id: string;
  name: string;
  condition: (data: any, context: any) => boolean;
  level: AlertLevel;
  type: AlertType;
  messageTemplate: string;
  suggestionTemplate: string;
}

// 指标预警规则
const metricAlertRules: AlertRule[] = [
  {
    id: 'hyperkalemia_critical',
    name: '严重高钾血症',
    condition: (record: HealthRecord) => record.potassium !== null && record.potassium > 6.0,
    level: 'critical',
    type: 'metric',
    messageTemplate: '血钾严重超标（{value} mmol/L），请立即联系医生或前往急诊！',
    suggestionTemplate: '血钾过高可能导致心律失常，请立即就医',
  },
  {
    id: 'hyperkalemia_warning',
    name: '高钾血症',
    condition: (record: HealthRecord) => record.potassium !== null && record.potassium > 5.5,
    level: 'warning',
    type: 'metric',
    messageTemplate: '血钾偏高（{value} mmol/L），请注意饮食控制',
    suggestionTemplate: '减少香蕉、橙子等高钾食物摄入，多饮水',
  },
  {
    id: 'hyperuricemia_warning',
    name: '高尿酸血症',
    condition: (record: HealthRecord) => record.uricAcid !== null && record.uricAcid > 420,
    level: 'warning',
    type: 'metric',
    messageTemplate: '尿酸偏高（{value} μmol/L），注意控制饮食，多饮水',
    suggestionTemplate: '减少海鲜、动物内脏等高嘌呤食物，多饮水',
  },
  {
    id: 'creatinine_rise',
    name: '肌酐突增',
    condition: (record: HealthRecord, context: { baseline?: number }) => {
      if (!record.creatinine || !context.baseline) return false;
      return record.creatinine > context.baseline * 1.2;
    },
    level: 'warning',
    type: 'metric',
    messageTemplate: '肌酐较基线上升{percent}%，建议及时就医复查',
    suggestionTemplate: '肌酐升高可能表示肾功能恶化，请及时就医',
  },
  {
    id: 'low_hemoglobin',
    name: '贫血',
    condition: (record: HealthRecord) => record.hemoglobin !== null && record.hemoglobin < 110,
    level: 'info',
    type: 'metric',
    messageTemplate: '血红蛋白偏低（{value} g/L），建议复查血常规',
    suggestionTemplate: '贫血可能加重疲劳感，请咨询医生是否需要补铁',
  },
];

// 检查健康记录预警
export async function checkHealthRecordAlerts(
  userId: string,
  record: HealthRecord,
  baselineCreatinine?: number
): Promise<Array<{ level: AlertLevel; message: string; suggestion: string }>> {
  const alerts: Array<{ level: AlertLevel; message: string; suggestion: string }> = [];

  for (const rule of metricAlertRules) {
    if (rule.condition(record, { baseline: baselineCreatinine })) {
      let message = rule.messageTemplate;
      let suggestion = rule.suggestionTemplate;

      // 替换模板变量
      if (record.potassium !== null) {
        message = message.replace('{value}', record.potassium.toString());
      }
      if (record.uricAcid !== null) {
        message = message.replace('{value}', record.uricAcid.toString());
      }
      if (record.hemoglobin !== null) {
        message = message.replace('{value}', record.hemoglobin.toString());
      }
      if (record.creatinine !== null && baselineCreatinine) {
        const percent = Math.round(((record.creatinine - baselineCreatinine) / baselineCreatinine) * 100);
        message = message.replace('{percent}', percent.toString());
      }

      alerts.push({
        level: rule.level,
        message,
        suggestion,
      });
    }
  }

  return alerts;
}

// 检查血药浓度预警
export async function checkDrugConcentrationAlerts(
  record: DrugConcentrationRecord
): Promise<Array<{ level: AlertLevel; message: string; suggestion: string }>> {
  const alerts: Array<{ level: AlertLevel; message: string; suggestion: string }> = [];

  if (!record.isInRange) {
    const status = record.concentration < record.referenceRangeMin ? '低于' : '高于';
    alerts.push({
      level: 'warning',
      message: `${record.drugName}血药浓度${status}目标范围`,
      suggestion: '建议咨询医生调整剂量，请勿自行调整药物剂量',
    });
  }

  return alerts;
}

// 创建预警
export async function createAlert(
  userId: string,
  data: {
    level: AlertLevel;
    type: AlertType;
    message: string;
    suggestion?: string;
    recordId?: string;
    metric?: string;
    medicationId?: string;
    medicationLogId?: string;
  }
) {
  const alert = await prisma.alert.create({
    data: {
      userId,
      level: data.level,
      type: data.type,
      message: data.message,
      suggestion: data.suggestion,
      recordId: data.recordId,
      metric: data.metric,
      medicationId: data.medicationId,
      medicationLogId: data.medicationLogId,
    },
  });

  logger.info(`创建预警: ${alert.id}, 用户: ${userId}, 级别: ${data.level}`);

  return alert;
}

// 获取预警列表
export async function getAlerts(
  userId: string,
  options: {
    level?: string;
    isRead?: boolean;
    page?: number;
    pageSize?: number;
  }
) {
  const { level, isRead, page = 1, pageSize = 20 } = options;

  const where: any = { userId };

  if (level) {
    where.level = level;
  }

  if (isRead !== undefined) {
    where.isRead = isRead;
  }

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.alert.count({ where }),
  ]);

  // 获取未读数量统计
  const unreadCount = await prisma.alert.groupBy({
    by: ['level'],
    where: { userId, isRead: false },
    _count: { level: true },
  });

  const unreadStats = {
    critical: unreadCount.find((u) => u.level === 'critical')?._count.level || 0,
    warning: unreadCount.find((u) => u.level === 'warning')?._count.level || 0,
    info: unreadCount.find((u) => u.level === 'info')?._count.level || 0,
    total: unreadCount.reduce((sum, u) => sum + u._count.level, 0),
  };

  return {
    list: alerts,
    unreadCount: unreadStats,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// 获取未读预警数量
export async function getUnreadAlertCount(userId: string) {
  const unreadCount = await prisma.alert.groupBy({
    by: ['level'],
    where: { userId, isRead: false },
    _count: { level: true },
  });

  return {
    critical: unreadCount.find((u) => u.level === 'critical')?._count.level || 0,
    warning: unreadCount.find((u) => u.level === 'warning')?._count.level || 0,
    info: unreadCount.find((u) => u.level === 'info')?._count.level || 0,
    total: unreadCount.reduce((sum, u) => sum + u._count.level, 0),
  };
}

// 标记预警为已读
export async function markAlertAsRead(userId: string, alertId: string) {
  const alert = await prisma.alert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) {
    throw new AppError('预警不存在', 404, '00003');
  }

  await prisma.alert.update({
    where: { id: alertId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// 标记所有预警为已读
export async function markAllAlertsAsRead(userId: string) {
  await prisma.alert.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// 删除预警
export async function deleteAlert(userId: string, alertId: string) {
  const alert = await prisma.alert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) {
    throw new AppError('预警不存在', 404, '00003');
  }

  await prisma.alert.delete({
    where: { id: alertId },
  });
}

// 检查漏服药物并创建预警
export async function checkMissedMedications(userId: string) {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // 查找30分钟前计划服药但状态为missed且没有预警的记录
  const missedLogs = await prisma.medicationLog.findMany({
    where: {
      userId,
      status: 'missed',
      scheduledTime: {
        lte: thirtyMinutesAgo,
      },
      alerts: {
        none: {},
      },
    },
    include: {
      medication: true,
    },
  });

  const alerts = [];

  for (const log of missedLogs) {
    const alert = await createAlert(userId, {
      level: 'warning',
      type: 'medication',
      message: `您已错过${log.medication.name}的服药时间，请尽快补服或咨询医生`,
      suggestion: '规律服药对控制病情非常重要',
      medicationId: log.medicationId,
      medicationLogId: log.id,
    });

    alerts.push(alert);
  }

  return alerts;
}
