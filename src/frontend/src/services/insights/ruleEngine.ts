import type { MetricKey, MetricValue, AnomalyResult, MedicationAdherence, HealthInsight } from './types'
import { getReferenceRange, evaluateLevel } from './referenceRanges'

const DISCLAIMER = '以上分析仅供参考，不构成医疗诊断或治疗建议。如有不适或指标异常，请及时联系主治医生。'

/**
 * 扫描所有指标，标记超出参考范围的异常值
 * 只取每个指标的最新记录进行判断
 */
export function detectAnomalies(data: Partial<Record<MetricKey, MetricValue[]>>): AnomalyResult[] {
  const anomalies: AnomalyResult[] = []

  for (const [key, values] of Object.entries(data)) {
    if (!values || values.length === 0) continue
    const metric = key as MetricKey
    const latest = [...values].sort((a, b) => a.date.localeCompare(b.date)).pop()!
    const level = evaluateLevel(metric, latest.value)

    if (level !== 'normal') {
      const range = getReferenceRange(metric)
      anomalies.push({
        metric,
        metricName: range.name,
        unit: range.unit,
        value: latest.value,
        date: latest.date,
        level,
        referenceRange: { min: range.min, max: range.max },
      })
    }
  }

  return anomalies.sort((a, b) => {
    const levelOrder = { critical: 0, warning: 1, normal: 2 }
    return levelOrder[a.level] - levelOrder[b.level]
  })
}

/**
 * 计算用药依从性
 */
export function calculateAdherence(
  logs: Array<{ medicationId: string; name: string; date: string; status: string; scheduledTime: string }>
): MedicationAdherence[] {
  const map = new Map<string, { name: string; total: number; taken: number }>()

  for (const log of logs) {
    // 忽略尚未到时间的待服用记录
    if (log.status === 'pending') continue

    const key = log.medicationId
    if (!map.has(key)) {
      map.set(key, { name: log.name, total: 0, taken: 0 })
    }
    const entry = map.get(key)!
    entry.total += 1
    if (log.status === 'taken') {
      entry.taken += 1
    }
  }

  return Array.from(map.entries()).map(([medicationId, v]) => ({
    medicationId,
    name: v.name,
    scheduledDays: v.total,
    takenDays: v.taken,
    missedDays: v.total - v.taken,
    adherenceRate: v.total === 0 ? 0 : Math.round((v.taken / v.total) * 100),
  }))
}

function mapSeverity(level: 'warning' | 'critical'): 'warning' | 'critical' {
  return level === 'critical' ? 'critical' : 'warning'
}

/**
 * 将异常结果转换为 Insight（供 UI 展示）
 */
export function anomalyToInsights(anomalies: AnomalyResult[]): HealthInsight[] {
  return anomalies.map((a) => {
    const isHigh = a.value > a.referenceRange.max
    const direction = isHigh ? '偏高' : '偏低'

    let content = `最新记录为 ${a.value}${a.unit}，${direction}。`
    if (a.level === 'critical') {
      content += '该指标偏离正常范围较多，建议尽快联系主治医生复查。'
    } else {
      content += '该指标略超出正常范围，请留意后续变化。'
    }

    return {
      type: 'anomaly',
      severity: mapSeverity(a.level),
      title: `${a.metricName}异常（${direction}）`,
      content,
      metric: a.metric,
      disclaimer: DISCLAIMER,
    }
  })
}

/**
 * 将依从性结果转换为 Insight
 */
export function adherenceToInsights(adherence: MedicationAdherence[]): HealthInsight[] {
  const insights: HealthInsight[] = []

  for (const a of adherence) {
    if (a.adherenceRate < 80) {
      insights.push({
        type: 'adherence',
        severity: 'warning',
        title: `「${a.name}」用药记录不完整`,
        content: `最近 ${a.scheduledDays} 次应服记录中，已服 ${a.takenDays} 次，漏服 ${a.missedDays} 次。用药记录的完整性会影响医生对您治疗情况的判断。`,
        disclaimer: DISCLAIMER,
      })
    }
  }

  if (insights.length === 0 && adherence.length > 0) {
    insights.push({
      type: 'adherence',
      severity: 'info',
      title: '用药依从性良好',
      content: `您的用药记录完整度较高，${adherence.length} 种药物均保持了规律的服药习惯。`,
      disclaimer: DISCLAIMER,
    })
  }

  return insights
}
