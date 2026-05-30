import { describe, expect, it } from 'vitest'
import { addAppDays, getAppDateString } from '../../utils/appDate'
import { generateInsightReport } from './engine'
import type { AnalysisInput, HealthInsight } from './types'

function recentDate(daysAgo: number) {
  return addAppDays(getAppDateString(), -daysAgo)
}

function buildInput(overrides: Partial<AnalysisInput> = {}): AnalysisInput {
  return {
    userType: 'kidney_failure',
    records: [],
    checkIns: [],
    medicationLogs: [],
    ...overrides,
  }
}

function findInsight(insights: HealthInsight[], titleIncludes: string) {
  return insights.find((insight) => insight.title.includes(titleIncludes))
}

describe('generateInsightReport daily health data', () => {
  it('builds trends from daily fields stored on health records', () => {
    const report = generateInsightReport(
      buildInput({
        records: [
          {
            recordDate: recentDate(2),
            weight: 62,
            bloodPressureSystolic: 118,
            bloodPressureDiastolic: 76,
            urineVolume: 1100,
            bloodSugar: 5.6,
          },
          {
            recordDate: recentDate(1),
            weight: 63,
            bloodPressureSystolic: 126,
            bloodPressureDiastolic: 82,
            urineVolume: 1350,
            bloodSugar: 6.0,
          },
        ],
      })
    )

    expect(findInsight(report.insights, '体重变化趋势')).toBeTruthy()
    expect(findInsight(report.insights, '收缩压变化趋势')).toBeTruthy()
    expect(findInsight(report.insights, '舒张压变化趋势')).toBeTruthy()
    expect(findInsight(report.insights, '尿量变化趋势')).toBeTruthy()
    expect(findInsight(report.insights, '血糖变化趋势')).toBeTruthy()
  })

  it('keeps potassium critical anomaly detection working', () => {
    const report = generateInsightReport(
      buildInput({
        records: [
          {
            recordDate: recentDate(1),
            potassium: 6.2,
          },
        ],
      })
    )

    expect(report.hasCriticalAnomaly).toBe(true)
    expect(findInsight(report.insights, '血钾异常')?.severity).toBe('critical')
  })

  it('describes tacrolimus as trend-only without fixed range anomaly', () => {
    const report = generateInsightReport(
      buildInput({
        userType: 'kidney_transplant',
        records: [
          {
            recordDate: recentDate(2),
            tacrolimus: 6,
          },
          {
            recordDate: recentDate(1),
            tacrolimus: 30,
          },
        ],
      })
    )

    const tacrolimusTrend = findInsight(report.insights, '他克莫司变化趋势')
    expect(tacrolimusTrend).toBeTruthy()
    expect(tacrolimusTrend?.content).toContain('医生设定的目标范围')
    expect(report.insights.some((insight) => insight.type === 'anomaly' && insight.metric === 'tacrolimus')).toBe(false)
  })

  it('builds trend-only insights from formal heart rate and transplant monitoring fields', () => {
    const report = generateInsightReport(
      buildInput({
        userType: 'kidney_transplant',
        records: [
          {
            recordDate: recentDate(2),
            heartRate: 70,
            egfr: 58,
            urineProteinCreatinineRatio: 0.2,
            bkVirusCopies: 0,
          },
          {
            recordDate: recentDate(1),
            heartRate: 76,
            egfr: 55,
            urineProteinCreatinineRatio: 0.3,
            bkVirusCopies: 1200,
          },
        ],
      })
    )

    expect(findInsight(report.insights, '心率变化趋势')).toBeTruthy()
    expect(findInsight(report.insights, 'eGFR变化趋势')).toBeTruthy()
    expect(findInsight(report.insights, '尿蛋白/肌酐比变化趋势')).toBeTruthy()
    expect(findInsight(report.insights, 'BK病毒载量变化趋势')).toBeTruthy()
    expect(report.insights.some((insight) => insight.type === 'anomaly' && insight.metric === 'bkVirusCopies')).toBe(false)
  })

  it('adds daily data completeness summary for blood pressure and urine volume', () => {
    const report = generateInsightReport(
      buildInput({
        records: [
          {
            recordDate: recentDate(3),
            bloodPressureSystolic: 120,
            bloodPressureDiastolic: 78,
          },
          {
            recordDate: recentDate(1),
            urineVolume: 900,
          },
        ],
      }),
      14
    )

    const summary = findInsight(report.insights, '健康数据概览')
    expect(summary?.content).toContain('最近 14 天有 1 天记录血压')
    expect(summary?.content).toContain('近 14 天尿量记录不足')
  })
})
