import { describe, expect, it } from 'vitest'
import {
  buildProfileEditPayload,
  buildOnboardingProfilePayload,
  getTransplantBaselinePrompt,
  getTransplantProfileChecklist,
  normalizeProfileForEdit,
} from './transplantProfile'

describe('transplant profile guidance helpers', () => {
  it('includes optional baseline creatinine in onboarding payload for transplant users', () => {
    const payload = buildOnboardingProfilePayload(
      'kidney_transplant',
      {
        name: '测试用户',
        gender: '',
        birthDate: '',
        height: '',
        currentWeight: '',
        diagnosisDate: '',
        transplantDate: '2025-05-01',
        baselineCreatinine: '92.5',
      }
    )

    expect(payload).toMatchObject({
      name: '测试用户',
      transplantDate: '2025-05-01',
      baselineCreatinine: 92.5,
    })
  })

  it('omits uncertain baseline creatinine without blocking onboarding', () => {
    const payload = buildOnboardingProfilePayload(
      'kidney_transplant',
      {
        name: '',
        gender: '',
        birthDate: '',
        height: '',
        currentWeight: '',
        diagnosisDate: '',
        transplantDate: '',
        baselineCreatinine: '',
      }
    )

    expect(payload).not.toHaveProperty('baselineCreatinine')
  })

  it('prompts transplant users to fill baseline only when missing', () => {
    expect(getTransplantBaselinePrompt({
      userType: 'kidney_transplant',
      hasTransplant: true,
      baselineCreatinine: null,
    })?.actionLabel).toBe('填写个人基线')

    expect(getTransplantBaselinePrompt({
      userType: 'kidney_transplant',
      hasTransplant: true,
      baselineCreatinine: 88,
    })).toBeNull()

    expect(getTransplantBaselinePrompt({
      userType: 'kidney_failure',
      hasTransplant: false,
      baselineCreatinine: null,
    })).toBeNull()
  })

  it('builds profile checklist for transplant date and baseline status', () => {
    expect(getTransplantProfileChecklist({
      userType: 'kidney_transplant',
      hasTransplant: true,
      transplantDate: '2025-05-01',
      baselineCreatinine: 90,
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
    })).toEqual([
      { label: '移植时间', value: '2025-05-01', completed: true },
      { label: '基线肌酐', value: '90 μmol/L', completed: true },
      { label: '他克莫司目标范围', value: '6-9 ng/mL', completed: true },
    ])

    expect(getTransplantProfileChecklist({
      userType: 'kidney_transplant',
      hasTransplant: true,
      baselineCreatinine: null,
    })).toEqual([
      { label: '移植时间', value: '未填写', completed: false },
      { label: '基线肌酐', value: '未填写', completed: false },
      { label: '他克莫司目标范围', value: '未填写', completed: false },
    ])
  })

  it('normalizes profile dates and numeric fields for ProfileEdit', () => {
    const profile = normalizeProfileForEdit({
      name: '测试用户',
      birthDate: '1990-01-02T00:00:00.000Z',
      diagnosisDate: '2024-03-04',
      transplantDate: '2025-05-06T00:00:00.000Z',
      baselineCreatinine: 91,
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
      userType: 'kidney_transplant',
      primaryDisease: 'other',
      hasTransplant: true,
    })

    expect(profile).toMatchObject({
      birthDate: '1990-01-02',
      diagnosisDate: '2024-03-04',
      transplantDate: '2025-05-06',
      baselineCreatinine: 91,
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
      userType: 'kidney_transplant',
      primaryDisease: 'other',
      hasTransplant: true,
    })
  })

  it('keeps doctor-configured tacrolimus target range in profile payload', () => {
    const payload = buildProfileEditPayload({
      userType: 'kidney_transplant',
      primaryDisease: 'other',
      hasTransplant: true,
      transplantDate: '2025-05-06',
      baselineCreatinine: 91,
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
    })

    expect(payload).toMatchObject({
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
    })
  })
})
