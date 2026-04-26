import prisma from '../config/database';
import { AlertLevel, AlertType, HealthRecord, DrugConcentrationRecord, MedicationFrequency } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const APP_TIME_ZONE = 'Asia/Shanghai';
const APP_TIME_ZONE_OFFSET = '+08:00';
const MISSED_MEDICATION_GRACE_MINUTES = 30;
const MEDICATION_ALERT_DISMISSED_MARKER = '[medication-alert-dismissed]';

function getAppDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function getAppDateTime(date: string, hours: number, minutes: number) {
  const hourText = hours.toString().padStart(2, '0');
  const minuteText = minutes.toString().padStart(2, '0');
  return new Date(`${date}T${hourText}:${minuteText}:00.000${APP_TIME_ZONE_OFFSET}`);
}

function shouldTakeMedicationToday(
  frequency: MedicationFrequency,
  createdAt: Date,
  todayDate = getAppDateString()
) {
  const todayStart = getAppDateTime(todayDate, 0, 0);
  const createdDate = getAppDateString(createdAt);
  const createdStart = getAppDateTime(createdDate, 0, 0);
  const daysSinceCreated = Math.floor(
    (todayStart.getTime() - createdStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (frequency) {
    case 'once_daily':
    case 'twice_daily':
    case 'three_daily':
      return true;
    case 'every_other_day':
      return daysSinceCreated % 2 === 0;
    case 'weekly':
      return daysSinceCreated % 7 === 0;
    default:
      return true;
  }
}

function hasDismissedMedicationAlert(notes?: string | null) {
  return notes?.includes(MEDICATION_ALERT_DISMISSED_MARKER) ?? false;
}

async function markMedicationAlertDismissed(medicationLogId?: string | null) {
  if (!medicationLogId) {
    return;
  }

  const log = await prisma.medicationLog.findUnique({
    where: { id: medicationLogId },
    select: { notes: true },
  });

  if (!log || hasDismissedMedicationAlert(log.notes)) {
    return;
  }

  await prisma.medicationLog.update({
    where: { id: medicationLogId },
    data: {
      notes: log.notes ? `${log.notes}\n${MEDICATION_ALERT_DISMISSED_MARKER}` : MEDICATION_ALERT_DISMISSED_MARKER,
    },
  });
}

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
    messageTemplate: '血钾偏高（{value} mmol/L），建议复查并咨询医生',
    suggestionTemplate: '高钾饮食可能影响血钾水平，具体饮食安排请咨询医生或营养师',
  },
  {
    id: 'hyperuricemia_warning',
    name: '高尿酸血症',
    condition: (record: HealthRecord) => record.uricAcid !== null && record.uricAcid > 420,
    level: 'warning',
    type: 'metric',
    messageTemplate: '尿酸偏高（{value} μmol/L），建议复查并咨询医生',
    suggestionTemplate: '尿酸水平与饮食习惯相关，具体饮食调整建议请咨询医生或营养师',
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
  await syncMissedMedicationAlerts(userId);

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
  await syncMissedMedicationAlerts(userId);

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

  if (alert.type === 'medication') {
    await markMedicationAlertDismissed(alert.medicationLogId);
  }

  await prisma.alert.delete({
    where: { id: alertId },
  });
}

// 删除所有已读预警
export async function deleteReadAlerts(userId: string) {
  const readMedicationAlerts = await prisma.alert.findMany({
    where: {
      userId,
      isRead: true,
      type: 'medication',
      medicationLogId: { not: null },
    },
    select: { medicationLogId: true },
  });

  const medicationLogIds = Array.from(
    new Set(
      readMedicationAlerts
        .map((alert) => alert.medicationLogId)
        .filter((id): id is string => Boolean(id))
    )
  );

  await Promise.all(medicationLogIds.map((id) => markMedicationAlertDismissed(id)));

  const result = await prisma.alert.deleteMany({
    where: { userId, isRead: true },
  });

  return result.count;
}

// 检查漏服药物并创建预警
export async function checkMissedMedications(userId: string) {
  return syncMissedMedicationAlerts(userId);
}

// 补齐今天已过提醒时间但没有日志的漏服提醒，避免依赖定时 worker 的单点触发
export async function syncMissedMedicationAlerts(userId: string) {
  const now = new Date();
  const todayDate = getAppDateString(now);
  const cutoff = new Date(now.getTime() - MISSED_MEDICATION_GRACE_MINUTES * 60 * 1000);

  const medications = await prisma.medication.findMany({
    where: {
      userId,
      status: 'active',
    },
  });

  const newlyCreatedAlerts = [];

  for (const medication of medications) {
    if (!shouldTakeMedicationToday(medication.frequency, medication.createdAt, todayDate)) {
      continue;
    }

    for (const reminderTime of medication.reminderTimes) {
      const scheduledTime = getAppDateTime(
        todayDate,
        reminderTime.getUTCHours(),
        reminderTime.getUTCMinutes()
      );

      if (scheduledTime > cutoff) {
        continue;
      }

      let log = await prisma.medicationLog.findFirst({
        where: {
          userId,
          medicationId: medication.id,
          scheduledTime: {
            gte: scheduledTime,
            lt: new Date(scheduledTime.getTime() + 60000),
          },
        },
        include: {
          medication: true,
          alerts: true,
        },
      });

      if (!log) {
        log = await prisma.medicationLog.create({
          data: {
            userId,
            medicationId: medication.id,
            scheduledTime,
            status: 'missed',
          },
          include: {
            medication: true,
            alerts: true,
          },
        });
      }

      if (log.status !== 'missed' || log.alerts.length > 0 || hasDismissedMedicationAlert(log.notes)) {
        continue;
      }

      const alert = await createAlert(userId, {
        level: 'warning',
        type: 'medication',
        message: `您已错过${log.medication.name}的服药时间，请尽快补服或咨询医生`,
        suggestion: '规律服药对控制病情非常重要',
        medicationId: log.medicationId,
        medicationLogId: log.id,
      });

      newlyCreatedAlerts.push(alert);
    }
  }

  // 兼容旧逻辑：如果已有 missed 日志但还没有预警，也一并补上
  const missedLogs = await prisma.medicationLog.findMany({
    where: {
      userId,
      status: 'missed',
      scheduledTime: {
        lte: cutoff,
      },
      OR: [
        { notes: null },
        { NOT: { notes: { contains: MEDICATION_ALERT_DISMISSED_MARKER } } },
      ],
      alerts: {
        none: {},
      },
    },
    include: {
      medication: true,
    },
  });

  for (const log of missedLogs) {
    const alert = await createAlert(userId, {
      level: 'warning',
      type: 'medication',
      message: `您已错过${log.medication.name}的服药时间，请尽快补服或咨询医生`,
      suggestion: '规律服药对控制病情非常重要',
      medicationId: log.medicationId,
      medicationLogId: log.id,
    });

    newlyCreatedAlerts.push(alert);
  }

  return newlyCreatedAlerts;
}
