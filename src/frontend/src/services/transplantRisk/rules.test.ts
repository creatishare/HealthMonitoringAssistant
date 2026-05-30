import { describe, expect, it } from 'vitest'
import { analyzeTransplantRisk, TRANSPLANT_RISK_DISCLAIMER } from './rules'

const fullRecord = {
  recordDate: '2026-05-28',
  creatinine: 98,
  egfr: 62,
  tacrolimus: 7.2,
  urineProteinCreatinineRatio: 0.18,
  urineAlbuminCreatinineRatio: 28,
  bkVirusCopies: 0,
  cmvVirusCopies: 0,
  ebvVirusCopies: 0,
}

const forbiddenDiagnosticWords = ['疑似排异', '排异', '感染', '药物毒性', '建议调药', '调整剂量']

function expectNoDiagnosisLanguage(text: string) {
  for (const word of forbiddenDiagnosticWords) {
    expect(text).not.toContain(word)
  }
}

describe('analyzeTransplantRisk', () => {
  it('returns critical action when creatinine rises more than 25% above personal baseline', () => {
    const risk = analyzeTransplantRisk({
      userType: 'kidney_transplant',
      baselineCreatinine: 100,
      transplantDate: '2025-01-01',
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
      records: [{ ...fullRecord, creatinine: 128 }],
    })

    expect(risk).toMatchObject({
      level: 'critical',
      title: '建议尽快联系移植医生',
      suggestedAction: '尽快联系移植医生，并携带近期化验结果复诊。',
      missingFields: [],
      creatinineChangePercent: 28,
      disclaimer: TRANSPLANT_RISK_DISCLAIMER,
    })
    expectNoDiagnosisLanguage(`${risk.message}${risk.suggestedAction}`)
  })

  it('returns warning for creatinine rise above 10% or three consecutive increases', () => {
    const tenPercentRisk = analyzeTransplantRisk({
      userType: 'kidney_transplant',
      baselineCreatinine: 100,
      records: [{ ...fullRecord, creatinine: 112 }],
    })

    expect(tenPercentRisk.level).toBe('warning')
    expect(tenPercentRisk.title).toBe('建议复查并观察趋势')
    expect(tenPercentRisk.creatinineChangePercent).toBe(12)

    const risingRisk = analyzeTransplantRisk({
      userType: 'kidney_transplant',
      baselineCreatinine: 100,
      records: [
        { ...fullRecord, recordDate: '2026-05-01', creatinine: 95 },
        { ...fullRecord, recordDate: '2026-05-10', creatinine: 99 },
        { ...fullRecord, recordDate: '2026-05-20', creatinine: 104 },
      ],
    })

    expect(risingRisk.level).toBe('warning')
    expect(risingRisk.message).toContain('最近3次肌酐呈连续上升趋势')
    expectNoDiagnosisLanguage(`${risingRisk.message}${risingRisk.suggestedAction}`)
  })

  it('uses doctor-configured tacrolimus target range without suggesting dose changes', () => {
    const risk = analyzeTransplantRisk({
      userType: 'kidney_transplant',
      baselineCreatinine: 100,
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
      records: [{ ...fullRecord, tacrolimus: 11 }],
    })

    expect(risk.level).toBe('warning')
    expect(risk.title).toContain('血药浓度')
    expect(risk.message).toContain('医生设定目标范围')
    expectNoDiagnosisLanguage(`${risk.message}${risk.suggestedAction}`)
  })

  it('asks for missing transplant follow-up fields instead of treating them as normal', () => {
    const risk = analyzeTransplantRisk({
      userType: 'kidney_transplant',
      records: [],
    })

    expect(risk.level).toBe('info')
    expect(risk.title).toBe('建议补充移植随访资料')
    expect(risk.message).toContain('建议补充数据')
    expect(risk.missingFields).toEqual([
      'baselineCreatinine',
      'creatinine',
      'egfr',
      'urineProteinCreatinineRatio',
      'urineAlbuminCreatinineRatio',
      'tacrolimus',
      'tacrolimusTargetRange',
      'bkVirusCopies',
      'cmvVirusCopies',
      'ebvVirusCopies',
    ])
  })

  it('returns stable info while still listing optional missing fields', () => {
    const risk = analyzeTransplantRisk({
      userType: 'kidney_transplant',
      baselineCreatinine: 100,
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
      records: [fullRecord],
    })

    expect(risk).toMatchObject({
      level: 'info',
      title: '核心指标暂未见明显偏离',
      missingFields: [],
    })
    expect(risk.message).toContain('请继续按医嘱复查')
  })
})
