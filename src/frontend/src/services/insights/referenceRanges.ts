import type { MetricKey } from './types'

/**
 * 参考范围定义
 * ⚠️ 这些数值是通用医学参考值，仅供数据标记使用，不能替代个体化诊疗标准。
 * 实际临床判断需结合患者年龄、性别、基础疾病、用药情况等由医生综合评估。
 */

export interface ReferenceRange {
  min: number
  max: number
  unit: string
  name: string
}

const COMMON_RANGES: Record<MetricKey, ReferenceRange> = {
  creatinine: { min: 44, max: 133, unit: 'μmol/L', name: '肌酐' },
  urea: { min: 2.6, max: 7.5, unit: 'mmol/L', name: '尿素氮' },
  potassium: { min: 3.5, max: 5.5, unit: 'mmol/L', name: '血钾' },
  uricAcid: { min: 208, max: 428, unit: 'μmol/L', name: '尿酸' },
  hemoglobin: { min: 120, max: 160, unit: 'g/L', name: '血红蛋白' },
  weight: { min: 40, max: 100, unit: 'kg', name: '体重' },
  systolic: { min: 90, max: 140, unit: 'mmHg', name: '收缩压' },
  diastolic: { min: 60, max: 90, unit: 'mmHg', name: '舒张压' },
}

export function getReferenceRange(metric: MetricKey): ReferenceRange {
  return COMMON_RANGES[metric]
}

export function getAllReferenceRanges(): Record<MetricKey, ReferenceRange> {
  return { ...COMMON_RANGES }
}

/**
 * 判断数值是否超出参考范围
 * @returns 'normal' | 'warning' | 'critical'
 *
 * 规则说明：
 * - critical: 严重偏离（超出正常值 30% 以上，或血钾>6.0/<3.0）
 * - warning: 轻度偏离（超出正常值但在 30% 以内）
 * - normal: 在参考范围内
 */
export function evaluateLevel(metric: MetricKey, value: number): 'normal' | 'warning' | 'critical' {
  const range = COMMON_RANGES[metric]
  const { min, max } = range

  // 特殊规则：血钾危险阈值更严格
  if (metric === 'potassium') {
    if (value >= 6.0 || value < 3.0) return 'critical'
    if (value > 5.5 || value < 3.5) return 'warning'
    return 'normal'
  }

  const mid = (min + max) / 2
  const deviation = Math.abs(value - mid) / mid

  if (value < min || value > max) {
    if (deviation > 0.3) return 'critical'
    return 'warning'
  }

  return 'normal'
}
