import prisma from '../config/database';
import { RecordSource } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

// 获取健康记录列表
export async function getHealthRecords(
  userId: string,
  options: {
    startDate?: string;
    endDate?: string;
    metric?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { startDate, endDate, metric, page = 1, pageSize = 20 } = options;

  const where: any = { userId };

  if (startDate || endDate) {
    where.recordDate = {};
    if (startDate) where.recordDate.gte = new Date(startDate);
    if (endDate) where.recordDate.lte = new Date(endDate);
  }

  // 如果指定了指标，只查询该指标不为空的记录
  if (metric) {
    where[metric] = { not: null };
  }

  const [records, total] = await Promise.all([
    prisma.healthRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.healthRecord.count({ where }),
  ]);

  return {
    list: records.map((record) => ({
      ...record,
      recordDate: record.recordDate.toISOString().split('T')[0],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// 获取单条记录
export async function getHealthRecordById(userId: string, recordId: string) {
  const record = await prisma.healthRecord.findFirst({
    where: { id: recordId, userId },
  });

  if (!record) {
    throw new AppError('记录不存在', 404, '00003');
  }

  return {
    ...record,
    recordDate: record.recordDate.toISOString().split('T')[0],
  };
}

// 创建健康记录
export async function createHealthRecord(
  userId: string,
  data: {
    recordDate: string;
    creatinine?: number;
    urea?: number;
    potassium?: number;
    sodium?: number;
    phosphorus?: number;
    uricAcid?: number;
    hemoglobin?: number;
    bloodSugar?: number;
    weight?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    urineVolume?: number;
    tacrolimus?: number;
    notes?: string;
    source?: RecordSource;
  }
) {
  const record = await prisma.healthRecord.create({
    data: {
      userId,
      recordDate: new Date(data.recordDate),
      creatinine: data.creatinine,
      urea: data.urea,
      potassium: data.potassium,
      sodium: data.sodium,
      phosphorus: data.phosphorus,
      uricAcid: data.uricAcid,
      hemoglobin: data.hemoglobin,
      bloodSugar: data.bloodSugar,
      weight: data.weight,
      bloodPressureSystolic: data.bloodPressureSystolic,
      bloodPressureDiastolic: data.bloodPressureDiastolic,
      urineVolume: data.urineVolume,
      tacrolimus: data.tacrolimus,
      notes: data.notes,
      source: data.source || 'manual',
    },
  });

  logger.info(`创建健康记录: ${record.id}, 用户: ${userId}`);

  return {
    ...record,
    recordDate: record.recordDate.toISOString().split('T')[0],
  };
}

// 更新健康记录
export async function updateHealthRecord(
  userId: string,
  recordId: string,
  data: Partial<{
    recordDate: string;
    creatinine: number;
    urea: number;
    potassium: number;
    sodium: number;
    phosphorus: number;
    uricAcid: number;
    hemoglobin: number;
    bloodSugar: number;
    weight: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    urineVolume: number;
    tacrolimus: number;
    notes: string;
  }>
) {
  // 检查记录是否存在且属于当前用户
  const existingRecord = await prisma.healthRecord.findFirst({
    where: { id: recordId, userId },
  });

  if (!existingRecord) {
    throw new AppError('记录不存在', 404, '00003');
  }

  const updateData: any = { ...data };
  if (data.recordDate) {
    updateData.recordDate = new Date(data.recordDate);
  }

  const record = await prisma.healthRecord.update({
    where: { id: recordId },
    data: updateData,
  });

  logger.info(`更新健康记录: ${recordId}`);

  return {
    ...record,
    recordDate: record.recordDate.toISOString().split('T')[0],
  };
}

// 删除健康记录
export async function deleteHealthRecord(userId: string, recordId: string) {
  // 检查记录是否存在且属于当前用户
  const existingRecord = await prisma.healthRecord.findFirst({
    where: { id: recordId, userId },
  });

  if (!existingRecord) {
    throw new AppError('记录不存在', 404, '00003');
  }

  await prisma.healthRecord.delete({
    where: { id: recordId },
  });

  logger.info(`删除健康记录: ${recordId}`);
}

// 获取趋势数据
export async function getTrends(
  userId: string,
  metrics: string[],
  startDate: string,
  endDate: string
) {
  const records = await prisma.healthRecord.findMany({
    where: {
      userId,
      recordDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      OR: metrics.map((metric) => ({ [metric]: { not: null } })),
    },
    orderBy: { recordDate: 'asc' },
    select: {
      recordDate: true,
      ...metrics.reduce((acc, metric) => ({ ...acc, [metric]: true }), {}),
    },
  });

  return {
    metrics,
    startDate,
    endDate,
    data: records.map((record) => ({
      date: record.recordDate.toISOString().split('T')[0],
      ...metrics.reduce((acc, metric) => {
        const value = (record as any)[metric];
        if (value !== null && value !== undefined) {
          acc[metric] = value;
        }
        return acc;
      }, {} as any),
    })),
  };
}

// 获取最近指标
export async function getRecentMetrics(userId: string, limit: number = 4) {
  const metrics = [
    { key: 'creatinine', name: '肌酐', unit: 'μmol/L' },
    { key: 'urea', name: '尿素氮', unit: 'mmol/L' },
    { key: 'potassium', name: '血钾', unit: 'mmol/L' },
    { key: 'uricAcid', name: '尿酸', unit: 'μmol/L' },
    { key: 'tacrolimus', name: '他克莫司', unit: 'ng/mL' },
    { key: 'hemoglobin', name: '血红蛋白', unit: 'g/L' },
    { key: 'weight', name: '体重', unit: 'kg' },
  ];

  const result = [];

  for (const { key, name, unit } of metrics) {
    const record = await prisma.healthRecord.findFirst({
      where: {
        userId,
        [key]: { not: null },
      },
      orderBy: { recordDate: 'desc' },
      select: {
        recordDate: true,
        [key]: true,
      },
    });

    if (record) {
      const value = (record as Record<string, any>)[key];
      result.push({
        key,
        name,
        value,
        unit,
        date: (record.recordDate instanceof Date ? record.recordDate : new Date(record.recordDate as unknown as string)).toISOString().split('T')[0],
      });
    }

    if (result.length >= limit) break;
  }

  return result;
}
