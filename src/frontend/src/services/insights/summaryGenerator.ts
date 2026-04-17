import type { TrendResult, HealthInsight, MedicationAdherence } from './types'

const DISCLAIMER = '以上分析仅供参考，不构成医疗诊断或治疗建议。如有不适或指标异常，请及时联系主治医生。'

/**
 * 根据趋势结果生成描述性摘要 Insight
 * 纯模板填充，不包含任何医疗判断
 */
export function generateTrendInsights(trends: TrendResult[]): HealthInsight[] {
  const insights: HealthInsight[] = []

  for (const t of trends) {
    if (t.dataPoints < 2 || t.currentValue === null) continue

    const parts: string[] = []
    parts.push(`${t.metricName}最新记录为 ${t.currentValue}${t.unit}。`)

    if (t.trendDirection === 'up') {
      parts.push(`较上一次记录有所上升。`)
    } else if (t.trendDirection === 'down') {
      parts.push(`较上一次记录有所下降。`)
    } else {
      parts.push(`与上次记录相比变化不大。`)
    }

    if (t.avgValue !== null) {
      parts.push(`近 ${t.dataPoints} 次记录的平均值为 ${t.avgValue}${t.unit}。`)
    }

    insights.push({
      type: 'trend',
      severity: 'info',
      title: `${t.metricName}变化趋势`,
      content: parts.join(''),
      metric: t.metric,
      disclaimer: DISCLAIMER,
    })
  }

  return insights
}

/**
 * 生成整体健康摘要文本
 */
export function generateOverallSummary(
  trends: TrendResult[],
  anomalies: HealthInsight[],
  adherence: MedicationAdherence[]
): string {
  const parts: string[] = []
  const now = new Date()
  parts.push(`本报告生成于 ${now.getMonth() + 1}月${now.getDate()}日。`)

  // 数据概况
  const activeMetrics = trends.filter((t) => t.dataPoints > 0).length
  if (activeMetrics > 0) {
    parts.push(`近 14 天内共记录了 ${activeMetrics} 项指标。`)
  }

  // 异常概况
  const criticalCount = anomalies.filter((a) => a.severity === 'critical').length
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length

  if (criticalCount > 0) {
    parts.push(`检测到 ${criticalCount} 项指标明显偏离正常范围，建议尽快联系主治医生。`)
  } else if (warningCount > 0) {
    parts.push(`有 ${warningCount} 项指标略超出正常范围，请注意观察后续变化。`)
  } else {
    parts.push(`各项指标目前均在正常参考范围内。`)
  }

  // 用药概况
  if (adherence.length > 0) {
    const avgRate = Math.round(
      adherence.reduce((sum, a) => sum + a.adherenceRate, 0) / adherence.length
    )
    parts.push(`用药记录完整度为 ${avgRate}%。`)
  }

  return parts.join('')
}

/**
 * 生成综合 Insight 列表（主入口）
 */
export function generateSummaryInsights(
  summary: string,
  hasCritical: boolean
): HealthInsight[] {
  const insights: HealthInsight[] = []

  insights.push({
    type: 'summary',
    severity: hasCritical ? 'critical' : 'info',
    title: '健康数据概览',
    content: summary,
    disclaimer: DISCLAIMER,
  })

  return insights
}
