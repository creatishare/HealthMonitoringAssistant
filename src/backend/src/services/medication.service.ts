import prisma from '../config/database';
import { MedicationFrequency, MedicationStatus } from '@prisma/client';
import logger from '../utils/logger';

// 获取用药列表
export async function getMedications(userId: string, status?: string) {
  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  const medications = await prisma.medication.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return {
    list: medications.map((med) => ({
      ...med,
      // 使用UTC方法获取时间，避免时区偏移
      reminderTimes: med.reminderTimes.map((t) => {
        const hours = t.getUTCHours().toString().padStart(2, '0');
        const minutes = t.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }),
    })),
  };
}

// 添加用药
export async function createMedication(
  userId: string,
  data: {
    name: string;
    specification?: string;
    dosage: number;
    dosageUnit: string;
    frequency: MedicationFrequency;
    reminderTimes: string[];
    reminderMinutesBefore?: number;
  }
) {
  // 转换时间字符串为Date对象 - 使用UTC时间存储，避免时区问题
  const reminderTimes = data.reminderTimes.map((time) => {
    const [hours, minutes] = time.split(':').map(Number);
    // 使用固定的基准日期 1970-01-01 存储纯时间
    const date = new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
    return date;
  });

  const medication = await prisma.medication.create({
    data: {
      userId,
      name: data.name,
      specification: data.specification,
      dosage: data.dosage,
      dosageUnit: data.dosageUnit,
      frequency: data.frequency,
      reminderTimes,
      reminderMinutesBefore: data.reminderMinutesBefore || 5,
      status: 'active',
    },
  });

  logger.info(`创建用药: ${medication.id}, 用户: ${userId}`);

  return {
    ...medication,
    // 使用UTC方法获取时间，避免时区偏移
    reminderTimes: medication.reminderTimes.map((t) => {
      const hours = t.getUTCHours().toString().padStart(2, '0');
      const minutes = t.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }),
  };
}

// 更新用药
export async function updateMedication(
  userId: string,
  medicationId: string,
  data: Partial<{
    name: string;
    specification: string;
    dosage: number;
    dosageUnit: string;
    frequency: MedicationFrequency;
    reminderTimes: string[];
    reminderMinutesBefore: number;
  }>
) {
  // 检查用药是否存在且属于当前用户
  const existingMed = await prisma.medication.findFirst({
    where: { id: medicationId, userId },
  });

  if (!existingMed) {
    throw new Error('药品不存在');
  }

  const updateData: any = { ...data };

  // 转换时间字符串 - 使用UTC时间存储，避免时区问题
  if (data.reminderTimes) {
    updateData.reminderTimes = data.reminderTimes.map((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      // 使用固定的基准日期 1970-01-01 存储纯时间
      const date = new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
      return date;
    });
  }

  const medication = await prisma.medication.update({
    where: { id: medicationId },
    data: updateData,
  });

  logger.info(`更新用药: ${medicationId}`);

  return {
    ...medication,
    // 使用UTC方法获取时间，避免时区偏移
    reminderTimes: medication.reminderTimes.map((t) => {
      const hours = t.getUTCHours().toString().padStart(2, '0');
      const minutes = t.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }),
  };
}

// 删除用药
export async function deleteMedication(userId: string, medicationId: string) {
  const existingMed = await prisma.medication.findFirst({
    where: { id: medicationId, userId },
  });

  if (!existingMed) {
    throw new Error('药品不存在');
  }

  await prisma.medication.delete({
    where: { id: medicationId },
  });

  logger.info(`删除用药: ${medicationId}`);
}

// 暂停用药
export async function pauseMedication(userId: string, medicationId: string) {
  const medication = await prisma.medication.findFirst({
    where: { id: medicationId, userId },
  });

  if (!medication) {
    throw new Error('药品不存在');
  }

  const updated = await prisma.medication.update({
    where: { id: medicationId },
    data: { status: 'paused' },
  });

  return updated;
}

// 恢复用药
export async function resumeMedication(userId: string, medicationId: string) {
  const medication = await prisma.medication.findFirst({
    where: { id: medicationId, userId },
  });

  if (!medication) {
    throw new Error('药品不存在');
  }

  const updated = await prisma.medication.update({
    where: { id: medicationId },
    data: { status: 'active' },
  });

  return updated;
}

// 获取今日用药
export async function getTodayMedications(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 获取所有活跃的用药
  const medications = await prisma.medication.findMany({
    where: {
      userId,
      status: 'active',
    },
  });

  const todayMedications: any[] = [];

  for (const med of medications) {
    // 根据频率判断今天是否需要服药
    const shouldTakeToday = checkShouldTakeToday(med.frequency, med.createdAt);

    if (!shouldTakeToday) continue;

    for (const time of med.reminderTimes) {
      const scheduledTime = new Date(today);
      // 使用UTC小时和分钟
      scheduledTime.setHours(time.getUTCHours(), time.getUTCMinutes(), 0, 0);

      // 查找是否已有记录
      const existingLog = await prisma.medicationLog.findFirst({
        where: {
          userId,
          medicationId: med.id,
          scheduledTime: {
            gte: scheduledTime,
            lt: new Date(scheduledTime.getTime() + 60000),
          },
        },
      });

      // 使用UTC方法格式化时间
      const hours = time.getUTCHours().toString().padStart(2, '0');
      const minutes = time.getUTCMinutes().toString().padStart(2, '0');
      todayMedications.push({
        medicationId: med.id,
        name: med.name,
        dosage: med.dosage,
        dosageUnit: med.dosageUnit,
        scheduledTime: `${hours}:${minutes}`,
        status: existingLog?.status || 'pending',
        logId: existingLog?.id,
      });
    }
  }

  // 按时间排序
  todayMedications.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  return {
    date: today.toISOString().split('T')[0],
    medications: todayMedications,
  };
}

// 检查今天是否需要服药
function checkShouldTakeToday(frequency: MedicationFrequency, createdAt: Date): boolean {
  const today = new Date();
  const daysSinceCreated = Math.floor(
    (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (frequency) {
    case 'once_daily':
    case 'twice_daily':
    case 'three_daily':
      return true;
    case 'every_other_day':
      return daysSinceCreated % 2 === 0;
    case 'weekly':
      return today.getDay() === createdAt.getDay();
    default:
      return true;
  }
}

// 记录服药
export async function recordMedication(
  userId: string,
  data: {
    medicationId: string;
    scheduledTime: string;
    actualTime?: string;
    status: 'taken' | 'missed' | 'skipped';
    skipReason?: string;
    notes?: string;
  }
) {
  const medication = await prisma.medication.findFirst({
    where: { id: data.medicationId, userId },
  });

  if (!medication) {
    throw new Error('药品不存在');
  }

  const log = await prisma.medicationLog.create({
    data: {
      userId,
      medicationId: data.medicationId,
      scheduledTime: new Date(data.scheduledTime),
      actualTime: data.actualTime ? new Date(data.actualTime) : null,
      status: data.status,
      skipReason: data.skipReason,
      notes: data.notes,
    },
    include: {
      medication: {
        select: {
          name: true,
          dosage: true,
          dosageUnit: true,
        },
      },
    },
  });

  logger.info(`记录服药: ${log.id}, 状态: ${data.status}`);

  return log;
}

// 获取服药记录
export async function getMedicationLogs(
  userId: string,
  options: {
    medicationId?: string;
    date?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { medicationId, date, status, page = 1, pageSize = 20 } = options;

  const where: any = { userId };

  if (medicationId) {
    where.medicationId = medicationId;
  }

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    where.scheduledTime = {
      gte: startDate,
      lt: endDate,
    };
  }

  if (status) {
    where.status = status;
  }

  const [logs, total] = await Promise.all([
    prisma.medicationLog.findMany({
      where,
      include: {
        medication: {
          select: {
            name: true,
            dosage: true,
            dosageUnit: true,
          },
        },
      },
      orderBy: { scheduledTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.medicationLog.count({ where }),
  ]);

  return {
    list: logs.map((log) => ({
      ...log,
      scheduledTime: log.scheduledTime.toISOString(),
      actualTime: log.actualTime?.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// 获取用药统计
export async function getMedicationStatistics(
  userId: string,
  startDate: string,
  endDate: string
) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // 总体统计
  const overallStats = await prisma.medicationLog.groupBy({
    by: ['status'],
    where: {
      userId,
      scheduledTime: {
        gte: start,
        lte: end,
      },
    },
    _count: {
      status: true,
    },
  });

  const totalScheduled = overallStats.reduce((sum, stat) => sum + stat._count.status, 0);
  const totalTaken = overallStats.find((s) => s.status === 'taken')?._count.status || 0;
  const totalMissed = overallStats.find((s) => s.status === 'missed')?._count.status || 0;
  const totalSkipped = overallStats.find((s) => s.status === 'skipped')?._count.status || 0;

  // 按药品统计
  const byMedication = await prisma.medicationLog.groupBy({
    by: ['medicationId', 'status'],
    where: {
      userId,
      scheduledTime: {
        gte: start,
        lte: end,
      },
    },
    _count: {
      status: true,
    },
  });

  // 获取药品信息
  const medicationIds = [...new Set(byMedication.map((b) => b.medicationId))];
  const medications = await prisma.medication.findMany({
    where: { id: { in: medicationIds } },
    select: { id: true, name: true },
  });

  const medicationMap = new Map(medications.map((m) => [m.id, m.name]));

  // 整理按药品统计
  const medicationStats: Record<
    string,
    { name: string; scheduled: number; taken: number; missed: number }
  > = {};

  for (const stat of byMedication) {
    if (!medicationStats[stat.medicationId]) {
      medicationStats[stat.medicationId] = {
        name: medicationMap.get(stat.medicationId) || '',
        scheduled: 0,
        taken: 0,
        missed: 0,
      };
    }
    medicationStats[stat.medicationId].scheduled += stat._count.status;
    if (stat.status === 'taken') {
      medicationStats[stat.medicationId].taken += stat._count.status;
    } else if (stat.status === 'missed') {
      medicationStats[stat.medicationId].missed += stat._count.status;
    }
  }

  const adherenceRate = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

  return {
    period: { startDate, endDate },
    overall: {
      totalScheduled,
      totalTaken,
      totalMissed,
      totalSkipped,
      adherenceRate: parseFloat(adherenceRate.toFixed(1)),
    },
    byMedication: Object.values(medicationStats).map((stat) => ({
      ...stat,
      adherenceRate:
        stat.scheduled > 0
          ? parseFloat(((stat.taken / stat.scheduled) * 100).toFixed(1))
          : 0,
    })),
  };
}
