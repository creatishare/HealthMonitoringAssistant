import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { userApi } from '../services/api'
import {
  buildProfileEditPayload,
  getTransplantBaselinePrompt,
  normalizeProfileForEdit,
  type ProfileEditValues,
} from '../services/transplantProfile'

export default function ProfileEdit() {
  const navigate = useNavigate()
  const location = useLocation()
  const { syncUserProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<ProfileEditValues>({
    name: '',
    gender: undefined,
    birthDate: '',
    height: undefined,
    currentWeight: undefined,
    dialysisType: 'none',
    dryWeight: undefined,
    baselineCreatinine: undefined,
    tacrolimusTargetMin: undefined,
    tacrolimusTargetMax: undefined,
    diagnosisDate: '',
    primaryDisease: '',
    hasTransplant: false,
    transplantDate: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (!loading && location.hash === '#disease-info') {
      document.getElementById('disease-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, location.hash])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response: any = await userApi.getProfile()
      const profile = response.data ?? response
      setFormData(normalizeProfileForEdit(profile))
    } catch (error) {
      toast.error('获取档案失败')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ProfileEditValues, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response: any = await userApi.updateProfile(buildProfileEditPayload(formData))
      const profile = response.data ?? response
      const nextUserType = (profile.userType ?? formData.userType) || null
      const nextPrimaryDisease = (profile.primaryDisease ?? formData.primaryDisease) || null
      syncUserProfile({
        name: profile.name ?? formData.name,
        userType: nextUserType,
        primaryDisease: nextPrimaryDisease,
        onboardingCompleted: profile.onboardingCompleted,
      })
      toast.success('保存成功')
      navigate('/profile')
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const transplantBaselinePrompt = getTransplantBaselinePrompt(formData)

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <BackButton />
        <h1 className="text-page-title font-semibold text-gray-text-primary">个人档案</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本信息 */}
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-small text-gray-text-secondary mb-1">昵称</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="请输入昵称"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-text-secondary mb-1">性别</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleChange('gender', 'male')}
                  className={`flex-1 py-2 rounded-lg border ${
                    formData.gender === 'male'
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-border text-gray-text-secondary'
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
                      : 'border-gray-border text-gray-text-secondary'
                  }`}
                >
                  女
                </button>
              </div>
            </div>
            <div>
              <label className="block text-small text-gray-text-secondary mb-1">出生日期</label>
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
              <label className="block text-small text-gray-text-secondary mb-1">身高 (cm)</label>
              <input
                type="number"
                value={formData.height || ''}
                onChange={(e) => handleChange('height', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="170"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-text-secondary mb-1">当前体重 (kg)</label>
              <input
                type="number"
                value={formData.currentWeight || ''}
                onChange={(e) => handleChange('currentWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="60"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-text-secondary mb-1">干体重 (kg)</label>
              <input
                type="number"
                value={formData.dryWeight || ''}
                onChange={(e) => handleChange('dryWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="58"
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        {/* 疾病信息 */}
        <div id="disease-info" className="card scroll-mt-24">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">疾病信息</h2>
          {transplantBaselinePrompt && (
            <div className="mb-4 rounded-[16px] border border-primary/15 bg-primary/10 p-3 text-helper text-gray-text-secondary dark:bg-primary/10">
              <p className="font-semibold text-gray-text-primary">{transplantBaselinePrompt.title}</p>
              <p className="mt-1">{transplantBaselinePrompt.message}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-small text-gray-text-secondary mb-1">透析类型</label>
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
              <label className="block text-small text-gray-text-secondary mb-1">确诊日期</label>
              <input
                type="date"
                value={formData.diagnosisDate || ''}
                onChange={(e) => handleChange('diagnosisDate', e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-small text-gray-text-secondary mb-1">原发疾病</label>
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
              <label className="block text-small text-gray-text-secondary mb-1">是否经过移植手术</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleChange('hasTransplant', true)}
                  className={`flex-1 py-2 rounded-lg border ${
                    formData.hasTransplant
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-border text-gray-text-secondary'
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
                      : 'border-gray-border text-gray-text-secondary'
                  }`}
                >
                  否
                </button>
              </div>
            </div>
            {formData.hasTransplant && (
              <>
                <div>
                  <label className="block text-small text-gray-text-secondary mb-1">移植时间</label>
                  <input
                    type="date"
                    value={formData.transplantDate || ''}
                    onChange={(e) => handleChange('transplantDate', e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-small text-gray-text-secondary mb-1">稳定期基线肌酐 (μmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.baselineCreatinine || ''}
                    onChange={(e) => handleChange('baselineCreatinine', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="如：92"
                    className="input-field w-full"
                  />
                  <p className="mt-1 text-small text-gray-text-helper">
                    如果不确定可以留空；补充后趋势报告会更有参考价值。
                  </p>
                </div>
                <div>
                  <label className="block text-small text-gray-text-secondary mb-1">他克莫司目标范围 (ng/mL)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.tacrolimusTargetMin || ''}
                      onChange={(e) => handleChange('tacrolimusTargetMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="下限"
                      className="input-field w-full"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={formData.tacrolimusTargetMax || ''}
                      onChange={(e) => handleChange('tacrolimusTargetMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="上限"
                      className="input-field w-full"
                    />
                  </div>
                  <p className="mt-1 text-small text-gray-text-helper">
                    仅填写医生告知的个人目标范围；不确定时请留空。
                  </p>
                </div>
              </>
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
