import type { PrimaryDisease, ProfileBasicInfo, UserType } from '../stores/authStore'

export interface OnboardingProfileDraft {
  name: string
  gender: 'male' | 'female' | ''
  birthDate: string
  height: string
  currentWeight: string
  diagnosisDate: string
  transplantDate: string
  baselineCreatinine: string
}

export interface ProfileLike {
  name?: string
  gender?: 'male' | 'female'
  birthDate?: string | null
  height?: number | null
  currentWeight?: number | null
  userType?: UserType | null
  dialysisType?: 'none' | 'hemodialysis' | 'peritoneal'
  dryWeight?: number | null
  baselineCreatinine?: number | null
  tacrolimusTargetMin?: number | null
  tacrolimusTargetMax?: number | null
  diagnosisDate?: string | null
  primaryDisease?: PrimaryDisease | string | null
  hasTransplant?: boolean | null
  transplantDate?: string | null
}

export interface ProfileEditValues {
  name?: string
  gender?: 'male' | 'female'
  birthDate?: string
  height?: number
  currentWeight?: number
  userType?: UserType | ''
  dialysisType?: 'none' | 'hemodialysis' | 'peritoneal'
  dryWeight?: number
  baselineCreatinine?: number
  tacrolimusTargetMin?: number
  tacrolimusTargetMax?: number
  diagnosisDate?: string
  primaryDisease?: PrimaryDisease | ''
  hasTransplant?: boolean
  transplantDate?: string
}

export interface TransplantBaselinePrompt {
  title: string
  message: string
  actionLabel: string
}

export interface TransplantChecklistItem {
  label: string
  value: string
  completed: boolean
}

function optionalString(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function optionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatDateOnly(value?: string | null) {
  return value ? value.split('T')[0] : ''
}

export function isTransplantProfile(profile?: { userType?: UserType | '' | null; hasTransplant?: boolean | null } | null) {
  return profile?.hasTransplant === true || profile?.userType === 'kidney_transplant'
}

export function buildOnboardingProfilePayload(userType: UserType, draft: OnboardingProfileDraft): ProfileBasicInfo {
  const payload: ProfileBasicInfo = {}

  const name = optionalString(draft.name)
  const gender = optionalString(draft.gender)
  const birthDate = optionalString(draft.birthDate)
  const height = optionalNumber(draft.height)
  const currentWeight = optionalNumber(draft.currentWeight)
  const diagnosisDate = optionalString(draft.diagnosisDate)
  const transplantDate = userType === 'kidney_transplant' ? optionalString(draft.transplantDate) : undefined
  const baselineCreatinine =
    userType === 'kidney_transplant' ? optionalNumber(draft.baselineCreatinine) : undefined

  if (name) payload.name = name
  if (gender === 'male' || gender === 'female') payload.gender = gender
  if (birthDate) payload.birthDate = birthDate
  if (height !== undefined) payload.height = height
  if (currentWeight !== undefined) payload.currentWeight = currentWeight
  if (diagnosisDate) payload.diagnosisDate = diagnosisDate
  if (transplantDate) payload.transplantDate = transplantDate
  if (baselineCreatinine !== undefined) payload.baselineCreatinine = baselineCreatinine

  return payload
}

export function getTransplantBaselinePrompt(
  profile?: { userType?: UserType | '' | null; hasTransplant?: boolean | null; baselineCreatinine?: number | null } | null
): TransplantBaselinePrompt | null {
  if (!isTransplantProfile(profile) || profile?.baselineCreatinine) {
    return null
  }

  return {
    title: '补充个人基线肌酐',
    message: '移植术后趋势更适合与个人稳定期基线比较。若你知道稳定期基线肌酐，可补充到个人档案，报告会更有参考价值。',
    actionLabel: '填写个人基线',
  }
}

export function getTransplantProfileChecklist(profile?: ProfileLike | null): TransplantChecklistItem[] {
  if (!isTransplantProfile(profile)) {
    return []
  }

  return [
    {
      label: '移植时间',
      value: profile?.transplantDate ? formatDateOnly(profile.transplantDate) : '未填写',
      completed: Boolean(profile?.transplantDate),
    },
    {
      label: '基线肌酐',
      value: profile?.baselineCreatinine ? `${profile.baselineCreatinine} μmol/L` : '未填写',
      completed: Boolean(profile?.baselineCreatinine),
    },
    {
      label: '他克莫司目标范围',
      value: profile?.tacrolimusTargetMin != null && profile?.tacrolimusTargetMax != null
        ? `${profile.tacrolimusTargetMin}-${profile.tacrolimusTargetMax} ng/mL`
        : '未填写',
      completed: profile?.tacrolimusTargetMin != null && profile?.tacrolimusTargetMax != null,
    },
  ]
}

export function normalizeProfileForEdit(profile?: ProfileLike | null): ProfileEditValues {
  return {
    name: profile?.name || '',
    gender: profile?.gender,
    birthDate: formatDateOnly(profile?.birthDate),
    height: profile?.height ?? undefined,
    currentWeight: profile?.currentWeight ?? undefined,
    userType: profile?.userType ?? '',
    dialysisType: profile?.dialysisType || 'none',
    dryWeight: profile?.dryWeight ?? undefined,
    baselineCreatinine: profile?.baselineCreatinine ?? undefined,
    tacrolimusTargetMin: profile?.tacrolimusTargetMin ?? undefined,
    tacrolimusTargetMax: profile?.tacrolimusTargetMax ?? undefined,
    diagnosisDate: formatDateOnly(profile?.diagnosisDate),
    primaryDisease: (profile?.primaryDisease as PrimaryDisease | undefined) ?? '',
    hasTransplant: profile?.hasTransplant ?? profile?.userType === 'kidney_transplant',
    transplantDate: formatDateOnly(profile?.transplantDate),
  }
}

export function buildProfileEditPayload(values: ProfileEditValues) {
  return {
    ...values,
    userType: values.userType || undefined,
    primaryDisease: values.primaryDisease || undefined,
    birthDate: values.birthDate || undefined,
    diagnosisDate: values.diagnosisDate || undefined,
    transplantDate: values.hasTransplant ? values.transplantDate || undefined : undefined,
    baselineCreatinine: values.baselineCreatinine,
    tacrolimusTargetMin: values.hasTransplant ? values.tacrolimusTargetMin : undefined,
    tacrolimusTargetMax: values.hasTransplant ? values.tacrolimusTargetMax : undefined,
  }
}
