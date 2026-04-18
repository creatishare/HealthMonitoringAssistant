import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore, type UserType, type PrimaryDisease } from '../stores/authStore'

const userTypeOptions: Array<{ value: UserType; title: string; description: string }> = [
  {
    value: 'kidney_failure',
    title: '肾衰竭患者',
    description: '用于记录透析、肌酐、体重等肾病相关健康数据。',
  },
  {
    value: 'kidney_transplant',
    title: '已完成肾移植',
    description: '用于持续追踪移植后恢复、用药与复查情况。',
  },
  {
    value: 'other',
    title: '其他',
    description: '先完成初始化，后续可在个人档案中继续完善信息。',
  },
]

const primaryDiseaseOptions: Array<{ value: PrimaryDisease; title: string }> = [
  { value: 'diabetic_nephropathy', title: '糖尿病肾病' },
  { value: 'hypertensive_nephropathy', title: '高血压肾病' },
  { value: 'chronic_glomerulonephritis', title: '慢性肾小球肾病' },
  { value: 'other', title: '不详/其他' },
]

type Step = 'userType' | 'primaryDisease' | 'profile'

export default function Onboarding() {
  const navigate = useNavigate()
  const { completeOnboarding } = useAuthStore()
  const [step, setStep] = useState<Step>('userType')
  const [selectedType, setSelectedType] = useState<UserType | null>(null)
  const [selectedDisease, setSelectedDisease] = useState<PrimaryDisease | null>(null)
  const [profile, setProfile] = useState<{
    name: string
    gender: 'male' | 'female' | ''
    birthDate: string
    height: string
    currentWeight: string
    diagnosisDate: string
    transplantDate: string
  }>({
    name: '',
    gender: '',
    birthDate: '',
    height: '',
    currentWeight: '',
    diagnosisDate: '',
    transplantDate: '',
  })
  const [loading, setLoading] = useState(false)

  const handleNext = () => {
    if (step === 'userType') {
      if (!selectedType) {
        toast.error('请选择您的身份')
        return
      }
      setStep('primaryDisease')
    } else if (step === 'primaryDisease') {
      if (!selectedDisease) {
        toast.error('请选择原发疾病类型')
        return
      }
      setStep('profile')
    }
  }

  const handleBack = () => {
    if (step === 'primaryDisease') {
      setStep('userType')
    } else if (step === 'profile') {
      setStep('primaryDisease')
    }
  }

  const handleSubmit = async () => {
    if (!selectedType || !selectedDisease) {
      toast.error('信息不完整')
      return
    }

    setLoading(true)
    try {
      await completeOnboarding(selectedType, selectedDisease, {
        name: profile.name || undefined,
        gender: profile.gender || undefined,
        birthDate: profile.birthDate || undefined,
        height: profile.height ? parseFloat(profile.height) : undefined,
        currentWeight: profile.currentWeight ? parseFloat(profile.currentWeight) : undefined,
        diagnosisDate: profile.diagnosisDate || undefined,
        transplantDate: profile.transplantDate || undefined,
      })
      toast.success('初始化完成')
      navigate('/')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-bg flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto">
        {step === 'userType' && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-title text-gray-text-primary mb-2">完善您的初始信息</h1>
              <p className="text-helper text-gray-secondary">
                首次登录请选择最符合您的身份，后续可在个人档案中修改。
              </p>
            </div>

            <div className="space-y-3">
              {userTypeOptions.map((option) => {
                const isSelected = selectedType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedType(option.value)}
                    className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary-light'
                        : 'border-gray-border bg-white dark:bg-dark-card'
                    }`}
                  >
                    <div className="text-body font-medium text-gray-text-primary mb-1">
                      {option.title}
                    </div>
                    <div className="text-helper text-gray-secondary">{option.description}</div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="btn-primary w-full mt-6"
            >
              继续
            </button>
          </>
        )}

        {step === 'primaryDisease' && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-title text-gray-text-primary mb-2">选择原发疾病</h1>
              <p className="text-helper text-gray-secondary">
                请选择导致您肾脏问题的原发疾病类型，以便我们为您推荐更合适的关注指标。
              </p>
            </div>

            <div className="space-y-3">
              {primaryDiseaseOptions.map((option) => {
                const isSelected = selectedDisease === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedDisease(option.value)}
                    className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary-light'
                        : 'border-gray-border bg-white dark:bg-dark-card'
                    }`}
                  >
                    <div className="text-body font-medium text-gray-text-primary">
                      {option.title}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                返回
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="btn-primary flex-1"
              >
                继续
              </button>
            </div>
          </>
        )}

        {step === 'profile' && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-title text-gray-text-primary mb-2">补全基本信息</h1>
              <p className="text-helper text-gray-secondary">
                这些信息将帮助我们为您提供更精准的健康数据分析。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-small text-gray-secondary mb-1">昵称</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile('name', e.target.value)}
                  placeholder="请输入昵称"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-small text-gray-secondary mb-1">性别</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => updateProfile('gender', 'male')}
                    className={`flex-1 py-2 rounded-lg border ${
                      profile.gender === 'male'
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-gray-border text-gray-secondary'
                    }`}
                  >
                    男
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProfile('gender', 'female')}
                    className={`flex-1 py-2 rounded-lg border ${
                      profile.gender === 'female'
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-gray-border text-gray-secondary'
                    }`}
                  >
                    女
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-small text-gray-secondary mb-1">出生日期</label>
                <input
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => updateProfile('birthDate', e.target.value)}
                  className="input-field w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-small text-gray-secondary mb-1">身高 (cm)</label>
                  <input
                    type="number"
                    value={profile.height}
                    onChange={(e) => updateProfile('height', e.target.value)}
                    placeholder="170"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-small text-gray-secondary mb-1">当前体重 (kg)</label>
                  <input
                    type="number"
                    value={profile.currentWeight}
                    onChange={(e) => updateProfile('currentWeight', e.target.value)}
                    placeholder="60"
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-small text-gray-secondary mb-1">确诊日期</label>
                <input
                  type="date"
                  value={profile.diagnosisDate}
                  onChange={(e) => updateProfile('diagnosisDate', e.target.value)}
                  className="input-field w-full"
                />
              </div>

              {selectedType === 'kidney_transplant' && (
                <div>
                  <label className="block text-small text-gray-secondary mb-1">移植时间</label>
                  <input
                    type="date"
                    value={profile.transplantDate}
                    onChange={(e) => updateProfile('transplantDate', e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                返回
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? '保存中...' : '完成'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
