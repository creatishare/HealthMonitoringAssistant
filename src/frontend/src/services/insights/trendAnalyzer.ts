import type { MetricKey, MetricValue, TrendResult } from './types'
import { getReferenceRange } from './referenceRanges'

function toFixed2(n: number | null): number | null {
  if (n === null || Number.isNaN(n)) return null
  return Math.round(n * 100) / 100
}

function computeAverage(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function computeChangePercent(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * 分析单个指标的时间趋势
 * @param metric 指标键
 * @param values 按日期升序排列的数值列表
 * @param daysWindow 分析窗口天数（默认 14）
 */
export function analyzeTrend(
  metric: MetricKey,
  values: MetricValue[],
  daysWindow = 14
): TrendResult {
  const range = getReferenceRange(metric)

  // 按日期去重，保留最新的
  const map = new Map<string, number>()
  for (const v of values) {
    map.set(v.date, v.value)
  }
  const sorted = Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length === 0) {
    return {
      metric,
      metricName: range.name,
      unit: range.unit,
      currentValue: null,
      previousValue: null,
      changePercent: null,
      trendDirection: 'insufficient_data',
      avgValue: null,
      dataPoints: 0,
    }
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysWindow)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const windowed = sorted.filter((v) => v.date >= cutoffStr)
  const useData = windowed.length >= 2 ? windowed : sorted.slice(-2)

  const currentValue = useData[useData.length - 1].value
  const previousValue = useData.length >= 2 ? useData[useData.length - 2].value : null

  const avgValue = computeAverage(useData.map((d) => d.value))

  let trendDirection: TrendResult['trendDirection'] = 'stable'

  if (previousValue !== null) {
    const diff = currentValue - previousValue
    const threshold = Math.abs(avgValue ?? currentValue) * 0.05 // 5% 视为波动
    if (diff > threshold) trendDirection = 'up'
    else if (diff < -threshold) trendDirection = 'down'
    else trendDirection = 'stable'
  } else {
    trendDirection = 'insufficient_data'
  }

  const changePercent = previousValue !== null
    ? computeChangePercent(currentValue, previousValue)
    : null

  return {
    metric,
    metricName: range.name,
    unit: range.unit,
    currentValue: toFixed2(currentValue),
    previousValue: toFixed2(previousValue),
    changePercent: toFixed2(changePercent),
    trendDirection,
    avgValue: toFixed2(avgValue),
    dataPoints: useData.length,
  }
}

/**
 * 分析多个指标的趋势
 */
export function analyzeAllTrends(
  data: Partial<Record<MetricKey, MetricValue[]>>,
  daysWindow = 14
): TrendResult[] {
  const results: TrendResult[] = []
  for (const [key, values] of Object.entries(data)) {
    if (values && values.length > 0) {
      results.push(analyzeTrend(key as MetricKey, values, daysWindow))
    }
  }
  return results.sort((a, b) => b.dataPoints - a.dataPoints)
}
