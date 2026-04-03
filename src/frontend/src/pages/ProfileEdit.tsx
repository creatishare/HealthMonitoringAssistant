import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'

interface UserProfile {
  name?: string
  gender?: 'male' | 'female'
  birthDate?: string
  height?: number
  weight?: number
  dialysisType?: 'none' | 'hemodialysis' | 'peritoneal'
  dryWeight?: number
  baselineCreatinine?: number
  diagnosisDate?: string
  primaryDisease?: string
  hasTransplant?: boolean
  transplantDate?: string
}

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    gender: undefined,
    birthDate: '',
    height: undefined,
    weight: undefined,
    dialysisType: 'none',
    dryWeight: undefined,
    baselineCreatinine: undefined,
    diagnosisDate: '',
    primaryDisease: '',
    hasTransplant: false,
    transplantDate: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          setFormData(prev => ({
            ...prev,
            ...data.data,
            birthDate: data.data.birthDate ? data.data.birthDate.split('T')[0] : '',
            diagnosisDate: data.data.diagnosisDate ? data.data.diagnosisDate.split('T')[0] : '',
            transplantDate: data.data.transplantDate ? data.data.transplantDate.split('T')[0] : '',
          }))
        }
      }
    } catch (error) {
      console.error('获取档案失败', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        toast.success('保存成功')
        navigate('/profile')
      } else {
        toast.error('保存失败')
      }
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} className="text-gray-text-primary" />
        </button>
        <h1 className="text-page-title font-semibold text-gray-text-primary">个人档案</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本信息 */}
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-small text-gray-secondary mb-1">姓名</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="请输入姓名"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-secondary mb-1">性别</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleChange('gender', 'male')}
                  className={`flex-1 py-2 rounded-lg border ${
                    formData.gender === 'male'
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-border text-gray-secondary'
                  }`}
                >
                  男
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('gender', 'female')}
                  className={`flex-1 py-2 rounded-lg border ${
                    formData.gender === 'female'
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
                value={formData.birthDate || ''}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        {/* 身体数据 */}
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">身体数据</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-small text-gray-secondary mb-1">身高 (cm)</label>
              <input
                type="number"
                value={formData.height || ''}
                onChange={(e) => handleChange('height', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="170"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-secondary mb-1">当前体重 (kg)</label>
              <input
                type="number"
                value={formData.weight || ''}
                onChange={(e) => handleChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="60"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-secondary mb-1">干体重 (kg)</label>
              <input
                type="number"
                value={formData.dryWeight || ''}
                onChange={(e) => handleChange('dryWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="58"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-secondary mb-1">基线肌酐 (μmol/L)</label>
              <input
                type="number"
                value={formData.baselineCreatinine || ''}
                onChange={(e) => handleChange('baselineCreatinine', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="100"
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        {/* 疾病信息 */}
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">疾病信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-small text-gray-secondary mb-1">透析类型</label>
              <select
                value={formData.dialysisType || 'none'}
                onChange={(e) => handleChange('dialysisType', e.target.value)}
                className="input-field w-full"
              >
                <option value="none">未透析</option>
                <option value="hemodialysis">血液透析</option>
                <option value="peritoneal">腹膜透析</option>
              </select>
            </div>
            <div>
              <label className="block text-small text-gray-secondary mb-1">确诊日期</label>
              <input
                type="date"
                value={formData.diagnosisDate || ''}
                onChange={(e) => handleChange('diagnosisDate', e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-secondary mb-1">原发疾病</label>
              <select
                value={formData.primaryDisease || ''}
                onChange={(e) => handleChange('primaryDisease', e.target.value)}
                className="input-field w-full"
              >
                <option value="">请选择</option>
                <option value="diabetic_nephropathy">糖尿病肾病</option>
                <option value="hypertensive_nephropathy">高血压肾病</option>
                <option value="chronic_glomerulonephritis">慢性肾小球肾炎</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-small text-gray-secondary mb-1">是否经过移植手术</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleChange('hasTransplant', true)}
                  className={`flex-1 py-2 rounded-lg border ${
                    formData.hasTransplant
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-border text-gray-secondary'
                  }`}
                >
                  是
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('hasTransplant', false)}
                  className={`flex-1 py-2 rounded-lg border ${
                    !formData.hasTransplant
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-border text-gray-secondary'
                  }`}
                >
                  否
                </button>
              </div>
            </div>
            {formData.hasTransplant && (
              <div>
                <label className="block text-small text-gray-secondary mb-1">移植时间</label>
                <input
                  type="date"
                  value={formData.transplantDate || ''}
                  onChange={(e) => handleChange('transplantDate', e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {saving ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  )
}
