import prisma from '../config/database';
import { RecordSource } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { formatDateOnly, getDateOnlyValue } from '../utils/app-date';
import { isValidDate, validateMetricRange } from '../utils/validators';

const HEALTH_RECORD_METRIC_KEYS = [
  'creatinine',
  'egfr',
  'urea',
  'potassium',
  'sodium',
  'phosphorus',
  'uricAcid',
  'hemoglobin',
  'bloodSugar',
  'weight',
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'urineVolume',
  'heartRate',
  'urineProteinCreatinineRatio',
  'urineAlbuminCreatinineRatio',
  'tacrolimus',
  'bkVirusCopies',
  'cmvVirusCopies',
  'ebvVirusCopies',
] as const;

type HealthRecordMetricKey = (typeof HEALTH_RECORD_METRIC_KEYS)[number];

const HEALTH_RECORD_METRIC_SET = new Set<string>(HEALTH_RECORD_METRIC_KEYS);
const HEALTH_RECORD_TEXT_KEYS = ['urineOccultBlood'] as const;
type HealthRecordTextKey = (typeof HEALTH_RECORD_TEXT_KEYS)[number];
const INTEGER_METRIC_SET = new Set<string>([
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'urineVolume',
  'heartRate',
]);

const HEALTH_RECORD_FIELD_LABELS: Record<string, string> = {
  recordDate: '记录日期',
  startDate: '开始日期',
  endDate: '结束日期',
  creatinine: '肌酐',
  egfr: 'eGFR',
  urea: '尿素氮',
  potassium: '血钾',
  sodium: '血钠',
  phosphorus: '血磷',
  uricAcid: '尿酸',
  hemoglobin: '血红蛋白',
  bloodSugar: '血糖',
  weight: '体重',
  bloodPressureSystolic: '收缩压',
  bloodPressureDiastolic: '舒张压',
  urineVolume: '尿量',
  heartRate: '心率',
  urineProteinCreatinineRatio: '尿蛋白/肌酐比',
  urineAlbuminCreatinineRatio: '尿白蛋白/肌酐比',
  urineOccultBlood: '尿潜血',
  tacrolimus: '他克莫司',
  bkVirusCopies: 'BK病毒载量',
  cmvVirusCopies: 'CMV病毒载量',
  ebvVirusCopies: 'EBV病毒载量',
  notes: '备注',
  source: '记录来源',
};

function isHealthRecordMetricKey(metric: string): metric is HealthRecordMetricKey {
  return HEALTH_RECORD_METRIC_SET.has(metric);
}

function ensurePlainObject(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError('请求体格式错误', 400, '00002');
  }

  return data as Record<string, unknown>;
}

function validateDateField(
  field: string,
  value: unknown,
  options: { required?: boolean } = {}
): string | undefined {
  if (value === undefined) {
    if (options.required) {
      throw new AppError(`${HEALTH_RECORD_FIELD_LABELS[field] || field}不能为空`, 400, '03002');
    }
    return undefined;
  }

  if (typeof value !== 'string' || !isValidDate(value)) {
    throw new AppError(`${HEALTH_RECORD_FIELD_LABELS[field] || field}格式错误，请使用 YYYY-MM-DD`, 400, '00002');
  }

  return value;
}

function validateDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  options: { required: true }
): { startDate: string; endDate: string };
function validateDateRange(
  startDate?: string,
  endDate?: string,
  options?: { required?: false }
): { startDate?: string; endDate?: string };
function validateDateRange(
  startDate?: string,
  endDate?: string,
  options: { required?: boolean } = {}
): { startDate?: string; endDate?: string } {
  const validStartDate = validateDateField('startDate', startDate, {
    required: options.required,
  });
  const validEndDate = validateDateField('endDate', endDate, {
    required: options.required,
  });

  if (validStartDate && validEndDate && validStartDate > validEndDate) {
    throw new AppError('开始日期不能晚于结束日期', 400, '00002');
  }

  return { startDate: validStartDate, endDate: validEndDate };
}

function validateMetricKey(metric: unknown, label = '健康指标'): HealthRecordMetricKey {
  if (typeof metric !== 'string') {
    throw new AppError(`${label}格式错误`, 400, '00002');
  }

  const normalized = metric.trim();

  if (!normalized) {
    throw new AppError(`${label}不能为空`, 400, '00002');
  }

  if (!isHealthRecordMetricKey(normalized)) {
    throw new AppError(`不支持的${label}：${normalized}`, 400, '00002');
  }

  return normalized;
}

function validateTrendMetrics(metrics: string[]) {
  const validated: HealthRecordMetricKey[] = [];
  const seen = new Set<string>();

  for (const metric of metrics) {
    const metricKey = validateMetricKey(metric, '趋势指标');
    if (!seen.has(metricKey)) {
      validated.push(metricKey);
      seen.add(metricKey);
    }
  }

  if (validated.length === 0) {
    throw new AppError('趋势指标不能为空', 400, '00002');
  }

  return validated;
}

function validateMetricValue(metric: HealthRecordMetricKey, value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const label = HEALTH_RECORD_FIELD_LABELS[metric] || metric;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError(`${label}必须是有效数字`, 400, '00002');
  }

  if (INTEGER_METRIC_SET.has(metric) && !Number.isInteger(value)) {
    throw new AppError(`${label}必须是整数`, 400, '00002');
  }

  const rangeResult = validateMetricRange(metric, value);
  if (!rangeResult.valid) {
    throw new AppError(rangeResult.message || `${label}数值超出允许范围`, 400, '00002');
  }

  return value;
}

function validateTextField(field: HealthRecordTextKey, value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const label = HEALTH_RECORD_FIELD_LABELS[field] || field;
  if (typeof value !== 'string') {
    throw new AppError(`${label}必须是字符串`, 400, '00002');
  }

  const trimmed = value.trim();
  if (trimmed.length > 50) {
    throw new AppError(`${label}不能超过50个字符`, 400, '00002');
  }

  return trimmed;
}

function sanitizeHealthRecordInput(
  data: unknown,
  options: { requireRecordDate?: boolean; allowSource?: boolean } = {}
) {
  const input = ensurePlainObject(data);
  const allowedFields = new Set<string>([
    'recordDate',
    'notes',
    ...HEALTH_RECORD_METRIC_KEYS,
    ...HEALTH_RECORD_TEXT_KEYS,
    ...(options.allowSource ? ['source'] : []),
  ]);
  const unknownFields = Object.keys(input).filter((key) => !allowedFields.has(key));

  if (unknownFields.length > 0) {
    throw new AppError(`不支持的字段：${unknownFields.join(', ')}`, 400, '00002');
  }

  const sanitized: Record<string, unknown> = {};
  const recordDate = validateDateField('recordDate', input.recordDate, {
    required: options.requireRecordDate,
  });
  if (recordDate !== undefined) {
    sanitized.recordDate = recordDate;
  }

  for (const metric of HEALTH_RECORD_METRIC_KEYS) {
    const value = validateMetricValue(metric, input[metric]);
    if (value !== undefined) {
      sanitized[metric] = value;
    }
  }

  for (const field of HEALTH_RECORD_TEXT_KEYS) {
    const value = validateTextField(field, input[field]);
    if (value !== undefined) {
      sanitized[field] = value;
    }
  }

  if (input.notes !== undefined) {
    if (input.notes !== null && typeof input.notes !== 'string') {
      throw new AppError('备注必须是字符串', 400, '00002');
    }
    sanitized.notes = input.notes;
  }

  if (options.allowSource && input.source !== undefined) {
    if (typeof input.source !== 'string' || !Object.values(RecordSource).includes(input.source as RecordSource)) {
      throw new AppError('记录来源不支持', 400, '00002');
    }
    sanitized.source = input.source;
  }

  return sanitized;
}

function validatePagination(page: number, pageSize: number) {
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError('页码必须是正整数', 400, '00002');
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) {
    throw new AppError('每页数量必须是 1 到 200 之间的整数', 400, '00002');
  }
}

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
  validatePagination(page, pageSize);
  const dateRange = validateDateRange(startDate, endDate);
  const metricFilter = metric !== undefined ? validateMetricKey(metric, '健康指标') : undefined;

  const where: any = { userId };

  if (dateRange.startDate || dateRange.endDate) {
    where.recordDate = {};
    if (dateRange.startDate) where.recordDate.gte = getDateOnlyValue(dateRange.startDate);
    if (dateRange.endDate) where.recordDate.lte = getDateOnlyValue(dateRange.endDate);
  }

  // 如果指定了指标，只查询该指标不为空的记录
  if (metricFilter) {
    where[metricFilter] = { not: null };
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
      recordDate: formatDateOnly(record.recordDate),
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
    recordDate: formatDateOnly(record.recordDate),
  };
}

// 创建健康记录
export async function createHealthRecord(
  userId: string,
  data: {
    recordDate: string;
    creatinine?: number;
    egfr?: number;
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
    heartRate?: number;
    urineProteinCreatinineRatio?: number;
    urineAlbuminCreatinineRatio?: number;
    urineOccultBlood?: string;
    tacrolimus?: number;
    bkVirusCopies?: number;
    cmvVirusCopies?: number;
    ebvVirusCopies?: number;
    notes?: string;
    source?: RecordSource;
  }
) {
  const sanitized = sanitizeHealthRecordInput(data, {
    requireRecordDate: true,
    allowSource: true,
  });
  const recordDate = sanitized.recordDate as string;
  const source = (sanitized.source as RecordSource | undefined) || 'manual';
  delete sanitized.recordDate;
  delete sanitized.source;

  const record = await prisma.healthRecord.create({
    data: {
      userId,
      recordDate: getDateOnlyValue(recordDate),
      ...sanitized,
      source,
    },
  });

  logger.info(`创建健康记录: ${record.id}, 用户: ${userId}`);

  return {
    ...record,
    recordDate: formatDateOnly(record.recordDate),
  };
}

// 更新健康记录
export async function updateHealthRecord(
  userId: string,
  recordId: string,
  data: Partial<{
    recordDate: string;
    creatinine: number;
    egfr: number;
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
    heartRate: number;
    urineProteinCreatinineRatio: number;
    urineAlbuminCreatinineRatio: number;
    urineOccultBlood: string;
    tacrolimus: number;
    bkVirusCopies: number;
    cmvVirusCopies: number;
    ebvVirusCopies: number;
    notes: string;
  }>
) {
  const sanitized = sanitizeHealthRecordInput(data);

  // 检查记录是否存在且属于当前用户
  const existingRecord = await prisma.healthRecord.findFirst({
    where: { id: recordId, userId },
  });

  if (!existingRecord) {
    throw new AppError('记录不存在', 404, '00003');
  }

  const updateData: any = { ...sanitized };
  if (sanitized.recordDate) {
    updateData.recordDate = getDateOnlyValue(sanitized.recordDate as string);
  }

  const record = await prisma.healthRecord.update({
    where: { id: recordId },
    data: updateData,
  });

  logger.info(`更新健康记录: ${recordId}`);

  return {
    ...record,
    recordDate: formatDateOnly(record.recordDate),
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
  const metricList = validateTrendMetrics(metrics);
  const dateRange = validateDateRange(startDate, endDate, { required: true });

  const records = await prisma.healthRecord.findMany({
    where: {
      userId,
      recordDate: {
        gte: getDateOnlyValue(dateRange.startDate),
        lte: getDateOnlyValue(dateRange.endDate),
      },
      OR: metricList.map((metric) => ({ [metric]: { not: null } })),
    },
    orderBy: { recordDate: 'asc' },
    select: {
      recordDate: true,
      ...metricList.reduce((acc, metric) => ({ ...acc, [metric]: true }), {}),
    },
  });

  return {
    metrics: metricList,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    data: records.map((record) => ({
      date: formatDateOnly(record.recordDate),
      ...metricList.reduce((acc, metric) => {
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
    { key: 'egfr', name: 'eGFR', unit: 'ml/min/1.73m²' },
    { key: 'urea', name: '尿素氮', unit: 'mmol/L' },
    { key: 'potassium', name: '血钾', unit: 'mmol/L' },
    { key: 'uricAcid', name: '尿酸', unit: 'μmol/L' },
    { key: 'tacrolimus', name: '他克莫司', unit: 'ng/mL' },
    { key: 'urineProteinCreatinineRatio', name: '尿蛋白/肌酐比', unit: 'mg/mg' },
    { key: 'heartRate', name: '心率', unit: '次/分' },
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
        date: formatDateOnly((record as Record<string, any>).recordDate),
      });
    }

    if (result.length >= limit) break;
  }

  return result;
}
