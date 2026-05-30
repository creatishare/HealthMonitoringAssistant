import type {
  AnalysisInput,
  InsightReport,
  MetricKey,
  MetricValue,
  HealthInsight,
  DailyDataCompleteness,
} from './types'
import { addAppDays, getAppDateString } from '../../utils/appDate'
import { analyzeAllTrends } from './trendAnalyzer'
import {
  detectAnomalies,
  calculateAdherence,
  anomalyToInsights,
  adherenceToInsights,
} from './ruleEngine'
import {
  generateTrendInsights,
  generateOverallSummary,
  generateSummaryInsights,
} from './summaryGenerator'
import {
  analyzeTransplantRisk,
  transplantRiskToInsightSeverity,
} from '../transplantRisk/rules'

/**
 * 将原始记录转换为指标时间序列
 */
function extractMetricSeries(input: AnalysisInput): Partial<Record<MetricKey, MetricValue[]>> {
  const series: Partial<Record<MetricKey, MetricValue[]>> = {}

  const push = (key: MetricKey, value: number | undefined, date: string) => {
    if (value === undefined || Number.isNaN(value)) return
    if (!series[key]) series[key] = []
    series[key]!.push({ value, date })
  }

  for (const r of input.records) {
    push('creatinine', r.creatinine, r.recordDate)
    push('urea', r.urea, r.recordDate)
    push('potassium', r.potassium, r.recordDate)
    push('uricAcid', r.uricAcid, r.recordDate)
    push('hemoglobin', r.hemoglobin, r.recordDate)
    push('bloodSugar', r.bloodSugar, r.recordDate)
    push('weight', r.weight, r.recordDate)
    push('heartRate', r.heartRate, r.recordDate)
    push('systolic', r.bloodPressureSystolic, r.recordDate)
    push('diastolic', r.bloodPressureDiastolic, r.recordDate)
    push('urineVolume', r.urineVolume, r.recordDate)
    push('egfr', r.egfr, r.recordDate)
    push('urineProteinCreatinineRatio', r.urineProteinCreatinineRatio, r.recordDate)
    push('urineAlbuminCreatinineRatio', r.urineAlbuminCreatinineRatio, r.recordDate)
    push('tacrolimus', r.tacrolimus, r.recordDate)
    push('bkVirusCopies', r.bkVirusCopies, r.recordDate)
    push('cmvVirusCopies', r.cmvVirusCopies, r.recordDate)
    push('ebvVirusCopies', r.ebvVirusCopies, r.recordDate)
  }

  for (const c of input.checkIns ?? []) {
    push('weight', c.weight, c.date)
    push('systolic', c.systolic, c.date)
    push('diastolic', c.diastolic, c.date)
    push('urineVolume', c.urineVolume, c.date)
  }

  return series
}

function calculateDailyDataCompleteness(input: AnalysisInput, periodDays: number): DailyDataCompleteness {
  const cutoff = addAppDays(getAppDateString(), -periodDays)
  const weightDates = new Set<string>()
  const bloodPressureDates = new Set<string>()
  const urineVolumeDates = new Set<string>()

  for (const record of input.records) {
    if (record.recordDate < cutoff) continue

    if (record.weight != null) {
      weightDates.add(record.recordDate)
    }

    if (record.bloodPressureSystolic != null && record.bloodPressureDiastolic != null) {
      bloodPressureDates.add(record.recordDate)
    }

    if (record.urineVolume != null) {
      urineVolumeDates.add(record.recordDate)
    }
  }

  for (const checkIn of input.checkIns ?? []) {
    if (checkIn.date < cutoff) continue

    if (checkIn.weight != null) {
      weightDates.add(checkIn.date)
    }

    if (checkIn.systolic != null && checkIn.diastolic != null) {
      bloodPressureDates.add(checkIn.date)
    }

    if (checkIn.urineVolume != null) {
      urineVolumeDates.add(checkIn.date)
    }
  }

  return {
    periodDays,
    weightDays: weightDates.size,
    bloodPressureDays: bloodPressureDates.size,
    urineVolumeDays: urineVolumeDates.size,
  }
}

/**
 * 生成健康洞察报告
 * 纯本地计算，不依赖任何外部 AI 服务
 */
export function generateInsightReport(input: AnalysisInput, periodDays = 14): InsightReport {
  const series = extractMetricSeries(input)

  // 1. 趋势分析
  const trends = analyzeAllTrends(series, periodDays)
  const dailyCompleteness = calculateDailyDataCompleteness(input, periodDays)

  // 2. 异常检测
  const anomalies = detectAnomalies(series)

  // 3. 用药依从性
  const adherence = calculateAdherence(input.medicationLogs)

  // 4. 转换为 Insights
  const anomalyInsights = anomalyToInsights(anomalies)
  const adherenceInsights = adherenceToInsights(adherence)
  const trendInsights = generateTrendInsights(trends)

  const hasCritical = anomalyInsights.some((i) => i.severity === 'critical')

  // 5. 生成整体摘要
  const summary = generateOverallSummary(trends, anomalyInsights, adherence, dailyCompleteness, periodDays)
  const summaryInsights = generateSummaryInsights(summary, hasCritical)
  const transplantRisk = input.userType === 'kidney_transplant' || input.hasTransplant
    ? analyzeTransplantRisk({
      userType: input.userType,
      hasTransplant: input.hasTransplant,
      transplantDate: input.transplantDate,
      baselineCreatinine: input.baselineCreatinine,
      tacrolimusTargetMin: input.tacrolimusTargetMin,
      tacrolimusTargetMax: input.tacrolimusTargetMax,
      records: input.records,
    })
    : null
  const transplantInsights: HealthInsight[] = transplantRisk
    ? [{
      type: 'transplant',
      severity: transplantRiskToInsightSeverity(transplantRisk.level),
      title: transplantRisk.title,
      content: `${transplantRisk.message}${transplantRisk.suggestedAction ? ` ${transplantRisk.suggestedAction}` : ''}`,
      disclaimer: transplantRisk.disclaimer,
    }]
    : []

  // 6. 组装报告：摘要 → 异常 → 用药 → 趋势
  const insights: HealthInsight[] = [
    ...summaryInsights,
    ...transplantInsights,
    ...anomalyInsights,
    ...adherenceInsights,
    ...trendInsights,
  ]

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    insights,
    hasCriticalAnomaly: hasCritical,
    summary,
  }
}

export * from './types'
export * from './referenceRanges'
export * from './trendAnalyzer'
export * from './ruleEngine'
export * from './summaryGenerator'
