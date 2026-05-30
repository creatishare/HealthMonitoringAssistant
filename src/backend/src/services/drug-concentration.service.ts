import prisma from '../config/database';
import { DrugType, SamplingTime } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import {
  addAppDays,
  formatDateOnly,
  getAppDateString,
  getAppDateTime,
  getAppTimeString,
  getDateOnlyValue,
} from '../utils/app-date';

// 参考值范围定义
const REFERENCE_RANGES: Record<DrugType, Record<SamplingTime, [number, number] | undefined>> = {
  cyclosporine: {
    C0: [100, 200],
    C2: [700, 1200],
  },
  tacrolimus: {
    C0: [5, 15],
    C2: undefined,
  },
  sirolimus: {
    C0: [5, 15],
    C2: undefined,
  },
  other: {
    C0: undefined,
    C2: undefined,
  },
};

// 获取参考范围
export function getReferenceRange(drugType: DrugType, samplingTime: SamplingTime): [number, number] | null {
  const range = REFERENCE_RANGES[drugType]?.[samplingTime];
  return range || null;
}

// 获取血药浓度记录列表
export async function getDrugConcentrations(
  userId: string,
  options: {
    drugType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const { drugType, startDate, endDate, page = 1, pageSize = 20 } = options;

  const where: any = { userId };

  if (drugType) {
    where.drugType = drugType;
  }

  if (startDate || endDate) {
    where.recordDate = {};
    if (startDate) where.recordDate.gte = getDateOnlyValue(startDate);
    if (endDate) where.recordDate.lte = getDateOnlyValue(endDate);
  }

  const [records, total] = await Promise.all([
    prisma.drugConcentrationRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.drugConcentrationRecord.count({ where }),
  ]);

  return {
    list: records.map((record) => ({
      ...record,
      recordDate: formatDateOnly(record.recordDate),
      referenceRange: [record.referenceRangeMin, record.referenceRangeMax],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// 创建血药浓度记录
export async function createDrugConcentration(
  userId: string,
  data: {
    recordDate: string;
    drugType: DrugType;
    drugName: string;
    concentration: number;
    samplingTime: SamplingTime;
    lastDoseTime: string;
    bloodDrawTime: string;
    notes?: string;
  }
) {
  // 获取参考范围
  const referenceRange = getReferenceRange(data.drugType, data.samplingTime);

  if (!referenceRange) {
    throw new AppError('该药物类型不支持此采样时间', 400, '00002');
  }

  const [min, max] = referenceRange;
  const isInRange = data.concentration >= min && data.concentration <= max;

  const record = await prisma.drugConcentrationRecord.create({
    data: {
      userId,
      recordDate: getDateOnlyValue(data.recordDate),
      drugType: data.drugType,
      drugName: data.drugName,
      concentration: data.concentration,
      samplingTime: data.samplingTime,
      lastDoseTime: new Date(data.lastDoseTime),
      bloodDrawTime: new Date(data.bloodDrawTime),
      referenceRangeMin: min,
      referenceRangeMax: max,
      isInRange,
      notes: data.notes,
    },
  });

  logger.info(`创建血药浓度记录: ${record.id}, 用户: ${userId}`);

  return {
    ...record,
    recordDate: formatDateOnly(record.recordDate),
    referenceRange: [record.referenceRangeMin, record.referenceRangeMax],
  };
}

// 获取血药浓度趋势
export async function getDrugConcentrationTrends(
  userId: string,
  drugType: DrugType,
  startDate: string,
  endDate: string
) {
  const records = await prisma.drugConcentrationRecord.findMany({
    where: {
      userId,
      drugType,
      recordDate: {
        gte: getDateOnlyValue(startDate),
        lte: getDateOnlyValue(endDate),
      },
    },
    orderBy: { recordDate: 'asc' },
  });

  // 获取药物名称
  const drugName = records.length > 0 ? records[0].drugName : '';

  // 获取参考范围
  const referenceRange: { C0?: [number, number]; C2?: [number, number] } = {};
  const c0Range = getReferenceRange(drugType, 'C0');
  const c2Range = getReferenceRange(drugType, 'C2');
  if (c0Range) referenceRange.C0 = c0Range;
  if (c2Range) referenceRange.C2 = c2Range;

  // 获取关联的用药记录
  const medicationLogs = await prisma.medicationLog.findMany({
    where: {
      userId,
      scheduledTime: {
        gte: getAppDateTime(startDate, 0, 0),
        lt: getAppDateTime(addAppDays(endDate, 1), 0, 0),
      },
    },
    include: {
      medication: true,
    },
    orderBy: { scheduledTime: 'asc' },
  });

  return {
    drugType,
    drugName,
    referenceRange,
    concentrations: records.map((record) => ({
      date: formatDateOnly(record.recordDate),
      value: record.concentration,
      samplingTime: record.samplingTime,
      isInRange: record.isInRange,
    })),
    medicationLogs: medicationLogs.map((log) => ({
      date: getAppDateString(log.scheduledTime),
      status: log.status,
      scheduledTime: getAppTimeString(log.scheduledTime),
      actualTime: log.actualTime
        ? getAppTimeString(log.actualTime)
        : undefined,
    })),
  };
}
