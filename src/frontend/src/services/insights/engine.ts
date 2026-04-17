import type {
  AnalysisInput,
  InsightReport,
  MetricKey,
  MetricValue,
  HealthInsight,
} from './types'
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
    push('weight', r.weight, r.recordDate)
  }

  for (const c of input.checkIns) {
    push('weight', c.weight, c.date)
    push('systolic', c.systolic, c.date)
    push('diastolic', c.diastolic, c.date)
  }

  return series
}

/**
 * 生成健康洞察报告
 * 纯本地计算，不依赖任何外部 AI 服务
 */
export function generateInsightReport(input: AnalysisInput, periodDays = 14): InsightReport {
  const series = extractMetricSeries(input)

  // 1. 趋势分析
  const trends = analyzeAllTrends(series, periodDays)

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
  const summary = generateOverallSummary(trends, anomalyInsights, adherence)
  const summaryInsights = generateSummaryInsights(summary, hasCritical)

  // 6. 组装报告：摘要 → 异常 → 用药 → 趋势
  const insights: HealthInsight[] = [
    ...summaryInsights,
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
