import { describe, expect, it } from 'vitest'
import {
  buildHealthRecordPayload,
  createHealthRecordFormValues,
  getFieldsForMode,
  getRecordSummary,
  getRecordType,
} from './healthRecordFields'

describe('health record field configuration and payload helpers', () => {
  it('uses one field set for daily, lab and full entry modes', () => {
    expect(getFieldsForMode('daily').map((field) => field.key)).toEqual([
      'weight',
      'urineVolume',
      'bloodPressureSystolic',
      'bloodPressureDiastolic',
      'heartRate',
    ])

    expect(getFieldsForMode('lab').map((field) => field.key)).toEqual([
      'creatinine',
      'egfr',
      'urea',
      'potassium',
      'sodium',
      'phosphorus',
      'hemoglobin',
      'bloodSugar',
      'uricAcid',
      'urineProteinCreatinineRatio',
      'urineAlbuminCreatinineRatio',
      'urineOccultBlood',
      'tacrolimus',
      'bkVirusCopies',
      'cmvVirusCopies',
      'ebvVirusCopies',
    ])

    expect(getFieldsForMode('full').map((field) => field.key)).toEqual([
      'weight',
      'urineVolume',
      'bloodPressureSystolic',
      'bloodPressureDiastolic',
      'heartRate',
      'creatinine',
      'egfr',
      'urea',
      'potassium',
      'sodium',
      'phosphorus',
      'hemoglobin',
      'bloodSugar',
      'uricAcid',
      'urineProteinCreatinineRatio',
      'urineAlbuminCreatinineRatio',
      'urineOccultBlood',
      'tacrolimus',
      'bkVirusCopies',
      'cmvVirusCopies',
      'ebvVirusCopies',
    ])
  })

  it('maps quick entry types to exactly the expected fields', () => {
    expect(getFieldsForMode('full', 'weight').map((field) => field.key)).toEqual(['weight'])
    expect(getFieldsForMode('full', 'urineVolume').map((field) => field.key)).toEqual(['urineVolume'])
    expect(getFieldsForMode('full', 'bloodPressure').map((field) => field.key)).toEqual([
      'bloodPressureSystolic',
      'bloodPressureDiastolic',
    ])
  })

  it('does not expose fixed tacrolimus 5-15 placeholder', () => {
    const tacrolimus = getFieldsForMode('lab').find((field) => field.key === 'tacrolimus')

    expect(tacrolimus?.placeholder).toContain('医生')
    expect(tacrolimus?.placeholder).not.toContain('5-15')
  })

  it('extracts heart rate from notes while preserving other notes', () => {
    const values = createHealthRecordFormValues({
      recordDate: '2026-05-30',
      weight: 62.5,
      notes: '晨起记录\n心率：72次/分\n轻微乏力',
    })

    expect(values.recordDate).toBe('2026-05-30')
    expect(values.weight).toBe('62.5')
    expect(values.heartRate).toBe('72')
    expect(values.notes).toBe('晨起记录\n轻微乏力')
  })

  it('serializes numeric fields, formal heart rate and transplant lab fields', () => {
    const payload = buildHealthRecordPayload({
      ...createHealthRecordFormValues(undefined, '2026-05-30'),
      weight: '62.5',
      urineVolume: '1200',
      bloodPressureSystolic: '121',
      bloodPressureDiastolic: '79',
      heartRate: '73',
      creatinine: '130.5',
      egfr: '52.8',
      urineProteinCreatinineRatio: '0.22',
      urineAlbuminCreatinineRatio: '35.5',
      urineOccultBlood: '+',
      bkVirusCopies: '1200',
      cmvVirusCopies: '0',
      ebvVirusCopies: '430',
      notes: '晨起记录',
    })

    expect(payload).toMatchObject({
      recordDate: '2026-05-30',
      weight: 62.5,
      urineVolume: 1200,
      bloodPressureSystolic: 121,
      bloodPressureDiastolic: 79,
      heartRate: 73,
      creatinine: 130.5,
      egfr: 52.8,
      urineProteinCreatinineRatio: 0.22,
      urineAlbuminCreatinineRatio: 35.5,
      urineOccultBlood: '+',
      bkVirusCopies: 1200,
      cmvVirusCopies: 0,
      ebvVirusCopies: 430,
      notes: '晨起记录',
    })
  })

  it('removes old heart rate note when the heart rate field is cleared', () => {
    const values = createHealthRecordFormValues({
      recordDate: '2026-05-30',
      notes: '复诊前记录\n心率：72次/分',
    })
    const payload = buildHealthRecordPayload({ ...values, heartRate: '' })

    expect(payload.notes).toBe('复诊前记录')
  })

  it('summarizes records consistently for list and detail screens', () => {
    expect(getRecordType({ recordDate: '2026-05-30', tacrolimus: 8 })).toBe('化验')
    expect(getRecordType({ recordDate: '2026-05-30', weight: 62 })).toBe('日常')
    expect(getRecordSummary({
      recordDate: '2026-05-30',
      weight: 62,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 78,
      heartRate: 72,
    })).toEqual(['体重: 62 kg', '血压: 120/78 mmHg', '心率: 72 次/分'])

    expect(getRecordSummary({
      recordDate: '2026-05-30',
      weight: 62,
      notes: '心率：71次/分',
    })).toEqual(['体重: 62 kg', '心率: 71 次/分'])

    expect(getRecordSummary({
      recordDate: '2026-05-30',
      egfr: 52.8,
      urineOccultBlood: '+',
      bkVirusCopies: 1200,
    })).toEqual(['eGFR: 52.8 ml/min/1.73m²', '尿潜血: +', 'BK病毒载量: 1200 copies/mL'])
  })
})
