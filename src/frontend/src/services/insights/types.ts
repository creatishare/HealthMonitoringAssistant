export type MetricKey =
  | 'creatinine'
  | 'urea'
  | 'potassium'
  | 'uricAcid'
  | 'hemoglobin'
  | 'weight'
  | 'systolic'
  | 'diastolic'

export interface MetricValue {
  value: number
  date: string
}

export interface TrendResult {
  metric: MetricKey
  metricName: string
  unit: string
  currentValue: number | null
  previousValue: number | null
  changePercent: number | null
  trendDirection: 'up' | 'down' | 'stable' | 'insufficient_data'
  avgValue: number | null
  dataPoints: number
}

export type AnomalyLevel = 'normal' | 'warning' | 'critical'

export interface AnomalyResult {
  metric: MetricKey
  metricName: string
  unit: string
  value: number
  date: string
  level: 'warning' | 'critical'
  referenceRange: { min: number; max: number }
}

export interface MedicationAdherence {
  medicationId: string
  name: string
  scheduledDays: number
  takenDays: number
  missedDays: number
  adherenceRate: number
}

export interface HealthInsight {
  type: 'trend' | 'anomaly' | 'adherence' | 'summary'
  severity: 'info' | 'warning' | 'critical'
  title: string
  content: string
  metric?: MetricKey
  /** 固定免责声明，永远不会为空 */
  disclaimer: string
}

export interface InsightReport {
  generatedAt: string
  periodDays: number
  insights: HealthInsight[]
  hasCriticalAnomaly: boolean
  summary: string
}

export interface AnalysisInput {
  userType: 'kidney_failure' | 'kidney_transplant' | 'other' | null
  records: Array<{
    recordDate: string
    creatinine?: number
    urea?: number
    potassium?: number
    uricAcid?: number
    hemoglobin?: number
    weight?: number
  }>
  checkIns: Array<{
    date: string
    weight?: number
    systolic?: number
    diastolic?: number
  }>
  medicationLogs: Array<{
    medicationId: string
    name: string
    date: string
    status: 'taken' | 'missed' | 'skipped' | 'pending'
    scheduledTime: string
  }>
}
