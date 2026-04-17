import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore, type UserType } from '../stores/authStore'

const onboardingOptions: Array<{ value: UserType; title: string; description: string }> = [
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

export default function Onboarding() {
  const navigate = useNavigate()
  const { completeOnboarding } = useAuthStore()
  const [selectedType, setSelectedType] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error('请选择您的身份')
      return
    }

    setLoading(true)
    try {
      await completeOnboarding(selectedType)
      toast.success('初始化完成')
      navigate('/')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-bg flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-title text-gray-text-primary mb-2">完善您的初始信息</h1>
          <p className="text-helper text-gray-secondary">首次登录请选择最符合您的身份，后续可在个人档案中修改。</p>
        </div>

        <div className="space-y-3">
          {onboardingOptions.map((option) => {
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
                <div className="text-body font-medium text-gray-text-primary mb-1">{option.title}</div>
                <div className="text-helper text-gray-secondary">{option.description}</div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full mt-6"
        >
          {loading ? '保存中...' : '继续'}
        </button>
      </div>
    </div>
  )
}
