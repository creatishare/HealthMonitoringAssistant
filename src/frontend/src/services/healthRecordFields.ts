import { getAppDateString } from '../utils/appDate'

export type HealthRecordFormMode = 'daily' | 'lab' | 'full'
export type HealthRecordQuickType = 'weight' | 'bloodPressure' | 'urineVolume' | null

export type HealthRecordFieldKey =
  | 'weight'
  | 'urineVolume'
  | 'bloodPressureSystolic'
  | 'bloodPressureDiastolic'
  | 'heartRate'
  | 'creatinine'
  | 'egfr'
  | 'urea'
  | 'potassium'
  | 'sodium'
  | 'phosphorus'
  | 'hemoglobin'
  | 'bloodSugar'
  | 'uricAcid'
  | 'urineProteinCreatinineRatio'
  | 'urineAlbuminCreatinineRatio'
  | 'urineOccultBlood'
  | 'tacrolimus'
  | 'bkVirusCopies'
  | 'cmvVirusCopies'
  | 'ebvVirusCopies'

type PersistedMetricKey = HealthRecordFieldKey

export interface HealthRecordFieldConfig {
  key: HealthRecordFieldKey
  label: string
  unit: string
  step: string
  placeholder: string
  valueType: 'float' | 'integer' | 'text'
  category: 'daily' | 'lab'
}

export interface HealthRecordLike {
  id?: string
  recordDate: string
  creatinine?: number | null
  egfr?: number | null
  urea?: number | null
  potassium?: number | null
  sodium?: number | null
  phosphorus?: number | null
  uricAcid?: number | null
  hemoglobin?: number | null
  bloodSugar?: number | null
  tacrolimus?: number | null
  weight?: number | null
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  urineVolume?: number | null
  heartRate?: number | null
  urineProteinCreatinineRatio?: number | null
  urineAlbuminCreatinineRatio?: number | null
  urineOccultBlood?: string | null
  notes?: string | null
  bkVirusCopies?: number | null
  cmvVirusCopies?: number | null
  ebvVirusCopies?: number | null
}

export type HealthRecordFormValues = {
  recordDate: string
  notes: string
} & Record<HealthRecordFieldKey, string>

export type HealthRecordPayload = {
  recordDate: string
  notes: string
} & Partial<Record<PersistedMetricKey, number | string>>

const HEART_RATE_LINE_PATTERN = /^\s*心率[:：]\s*(\d+(?:\.\d+)?)\s*次\/分\s*$/m
const HEART_RATE_REMOVE_PATTERN = /^\s*心率[:：]\s*\d+(?:\.\d+)?\s*次\/分\s*$/gm

export const DAILY_HEALTH_RECORD_FIELDS: HealthRecordFieldConfig[] = [
  { key: 'weight', label: '体重', unit: 'kg', step: '0.1', placeholder: '62.5', valueType: 'float', category: 'daily' },
  { key: 'urineVolume', label: '尿量', unit: 'ml', step: '1', placeholder: '1200', valueType: 'integer', category: 'daily' },
  { key: 'bloodPressureSystolic', label: '收缩压', unit: 'mmHg', step: '1', placeholder: '120', valueType: 'integer', category: 'daily' },
  { key: 'bloodPressureDiastolic', label: '舒张压', unit: 'mmHg', step: '1', placeholder: '80', valueType: 'integer', category: 'daily' },
  { key: 'heartRate', label: '心率', unit: '次/分', step: '1', placeholder: '72', valueType: 'integer', category: 'daily' },
]

export const LAB_HEALTH_RECORD_FIELDS: HealthRecordFieldConfig[] = [
  { key: 'creatinine', label: '肌酐', unit: 'μmol/L', step: '0.01', placeholder: '130', valueType: 'float', category: 'lab' },
  { key: 'egfr', label: 'eGFR', unit: 'ml/min/1.73m²', step: '0.1', placeholder: '58', valueType: 'float', category: 'lab' },
  { key: 'urea', label: '尿素氮', unit: 'mmol/L', step: '0.01', placeholder: '8.2', valueType: 'float', category: 'lab' },
  { key: 'potassium', label: '血钾', unit: 'mmol/L', step: '0.01', placeholder: '4.8', valueType: 'float', category: 'lab' },
  { key: 'sodium', label: '血钠', unit: 'mmol/L', step: '0.01', placeholder: '140', valueType: 'float', category: 'lab' },
  { key: 'phosphorus', label: '血磷', unit: 'mmol/L', step: '0.01', placeholder: '1.2', valueType: 'float', category: 'lab' },
  { key: 'hemoglobin', label: '血红蛋白', unit: 'g/L', step: '0.01', placeholder: '120', valueType: 'float', category: 'lab' },
  { key: 'bloodSugar', label: '血糖', unit: 'mmol/L', step: '0.01', placeholder: '5.6', valueType: 'float', category: 'lab' },
  { key: 'uricAcid', label: '尿酸', unit: 'μmol/L', step: '0.01', placeholder: '420', valueType: 'float', category: 'lab' },
  { key: 'urineProteinCreatinineRatio', label: '尿蛋白/肌酐比', unit: 'mg/mg', step: '0.01', placeholder: '0.2', valueType: 'float', category: 'lab' },
  { key: 'urineAlbuminCreatinineRatio', label: '尿白蛋白/肌酐比', unit: 'mg/g', step: '0.1', placeholder: '30', valueType: 'float', category: 'lab' },
  { key: 'urineOccultBlood', label: '尿潜血', unit: '', step: '1', placeholder: '阴性 / ± / +', valueType: 'text', category: 'lab' },
  { key: 'tacrolimus', label: '他克莫司', unit: 'ng/mL', step: '0.01', placeholder: '按医生目标范围记录，如：8.0', valueType: 'float', category: 'lab' },
  { key: 'bkVirusCopies', label: 'BK病毒载量', unit: 'copies/mL', step: '1', placeholder: '0', valueType: 'float', category: 'lab' },
  { key: 'cmvVirusCopies', label: 'CMV病毒载量', unit: 'copies/mL', step: '1', placeholder: '0', valueType: 'float', category: 'lab' },
  { key: 'ebvVirusCopies', label: 'EBV病毒载量', unit: 'copies/mL', step: '1', placeholder: '0', valueType: 'float', category: 'lab' },
]

export const ALL_HEALTH_RECORD_FIELDS = [
  ...DAILY_HEALTH_RECORD_FIELDS,
  ...LAB_HEALTH_RECORD_FIELDS,
]

const FIELD_CONFIG_BY_KEY = new Map(ALL_HEALTH_RECORD_FIELDS.map((field) => [field.key, field]))
const LAB_FIELD_KEYS = new Set(LAB_HEALTH_RECORD_FIELDS.map((field) => field.key))

export function getFieldsForMode(
  mode: HealthRecordFormMode,
  quickType: HealthRecordQuickType = null
): HealthRecordFieldConfig[] {
  if (quickType === 'weight') {
    return DAILY_HEALTH_RECORD_FIELDS.filter((field) => field.key === 'weight')
  }

  if (quickType === 'urineVolume') {
    return DAILY_HEALTH_RECORD_FIELDS.filter((field) => field.key === 'urineVolume')
  }

  if (quickType === 'bloodPressure') {
    return DAILY_HEALTH_RECORD_FIELDS.filter((field) =>
      field.key === 'bloodPressureSystolic' || field.key === 'bloodPressureDiastolic'
    )
  }

  if (mode === 'daily') return DAILY_HEALTH_RECORD_FIELDS
  if (mode === 'lab') return LAB_HEALTH_RECORD_FIELDS
  return ALL_HEALTH_RECORD_FIELDS
}

export function extractHeartRateFromNotes(notes?: string | null): string {
  const match = notes?.match(HEART_RATE_LINE_PATTERN)
  return match?.[1] ?? ''
}

export function stripHeartRateFromNotes(notes?: string | null): string {
  if (!notes) return ''

  return notes
    .replace(HEART_RATE_REMOVE_PATTERN, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function toFormText(value?: number | null) {
  return value == null ? '' : String(value)
}

export function createHealthRecordFormValues(
  record?: Partial<HealthRecordLike>,
  fallbackDate = getAppDateString()
): HealthRecordFormValues {
  return {
    recordDate: record?.recordDate || fallbackDate,
    weight: toFormText(record?.weight),
    urineVolume: toFormText(record?.urineVolume),
    bloodPressureSystolic: toFormText(record?.bloodPressureSystolic),
    bloodPressureDiastolic: toFormText(record?.bloodPressureDiastolic),
    heartRate: record?.heartRate != null ? String(record.heartRate) : extractHeartRateFromNotes(record?.notes),
    creatinine: toFormText(record?.creatinine),
    egfr: toFormText(record?.egfr),
    urea: toFormText(record?.urea),
    potassium: toFormText(record?.potassium),
    sodium: toFormText(record?.sodium),
    phosphorus: toFormText(record?.phosphorus),
    hemoglobin: toFormText(record?.hemoglobin),
    bloodSugar: toFormText(record?.bloodSugar),
    uricAcid: toFormText(record?.uricAcid),
    urineProteinCreatinineRatio: toFormText(record?.urineProteinCreatinineRatio),
    urineAlbuminCreatinineRatio: toFormText(record?.urineAlbuminCreatinineRatio),
    urineOccultBlood: record?.urineOccultBlood ?? '',
    tacrolimus: toFormText(record?.tacrolimus),
    bkVirusCopies: toFormText(record?.bkVirusCopies),
    cmvVirusCopies: toFormText(record?.cmvVirusCopies),
    ebvVirusCopies: toFormText(record?.ebvVirusCopies),
    notes: stripHeartRateFromNotes(record?.notes),
  }
}

function parseFieldValue(value: string, valueType: HealthRecordFieldConfig['valueType']) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (valueType === 'text') return trimmed
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) return undefined
  return valueType === 'integer' ? parsed : parsed
}

export function buildHealthRecordPayload(values: HealthRecordFormValues): HealthRecordPayload {
  const payload: HealthRecordPayload = {
    recordDate: values.recordDate,
    notes: stripHeartRateFromNotes(values.notes),
  }

  for (const field of ALL_HEALTH_RECORD_FIELDS) {
    const parsed = parseFieldValue(values[field.key], field.valueType)
    if (parsed !== undefined) {
      payload[field.key] = parsed
    }
  }

  return payload
}

export function getRecordType(record: HealthRecordLike) {
  const hasLab = Array.from(LAB_FIELD_KEYS).some((key) => record[key as PersistedMetricKey] != null)
  return hasLab ? '化验' : '日常'
}

export function getFieldConfig(key: HealthRecordFieldKey) {
  return FIELD_CONFIG_BY_KEY.get(key)
}

export function getRecordSummary(record: HealthRecordLike) {
  const type = getRecordType(record)
  const heartRate = record.heartRate != null ? String(record.heartRate) : extractHeartRateFromNotes(record.notes)

  if (type === '化验') {
    return LAB_HEALTH_RECORD_FIELDS.map((field) => {
      const value = record[field.key as PersistedMetricKey]
      return value != null ? `${field.label}: ${value}${field.unit ? ` ${field.unit}` : ''}` : null
    }).filter(Boolean) as string[]
  }

  return [
    record.weight != null ? `体重: ${record.weight} kg` : null,
    record.bloodPressureSystolic != null && record.bloodPressureDiastolic != null
      ? `血压: ${record.bloodPressureSystolic}/${record.bloodPressureDiastolic} mmHg`
      : null,
    heartRate ? `心率: ${heartRate} 次/分` : null,
    record.urineVolume != null ? `尿量: ${record.urineVolume} ml` : null,
  ].filter(Boolean) as string[]
}
