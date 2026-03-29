import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, X } from 'lucide-react'
import { medicationApi } from '../services/api'
import toast from 'react-hot-toast'

const frequencies = [
  { value: 'once_daily', label: '每日1次' },
  { value: 'twice_daily', label: '每日2次' },
  { value: 'three_daily', label: '每日3次' },
  { value: 'every_other_day', label: '隔日一次' },
  { value: 'weekly', label: '每周一次' },
]

export default function MedicationForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    specification: '',
    dosage: '',
    dosageUnit: '片',
    frequency: 'once_daily',
    reminderTimes: ['08:00'],
    reminderMinutesBefore: 5,
  })

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addReminderTime = () => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: [...prev.reminderTimes, '12:00'],
    }))
  }

  const removeReminderTime = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter((_, i) => i !== index),
    }))
  }

  const updateReminderTime = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      reminderTimes: prev.reminderTimes.map((t, i) => (i === index ? value : t)),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await medicationApi.create({
        ...formData,
        dosage: parseFloat(formData.dosage),
      })
      toast.success('添加成功')
      navigate('/medications')
    } catch (error: any) {
      toast.error(error.response?.data?.message || '添加失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} className="text-gray-text-primary" />
        </button>
        <h1 className="text-page-title font-semibold text-gray-text-primary">添加用药</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">药品信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-helper text-gray-secondary mb-2">药品名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="如：环孢素软胶囊"
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-helper text-gray-secondary mb-2">规格</label>
              <input
                type="text"
                value={formData.specification}
                onChange={(e) => handleChange('specification', e.target.value)}
                placeholder="如：25mg/粒"
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">用法用量</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-helper text-gray-secondary mb-2">每次剂量 *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.dosage}
                  onChange={(e) => handleChange('dosage', e.target.value)}
                  placeholder="如：2"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-helper text-gray-secondary mb-2">单位 *</label>
                <select
                  value={formData.dosageUnit}
                  onChange={(e) => handleChange('dosageUnit', e.target.value)}
                  className="input-field w-full"
                >
                  <option value="片">片</option>
                  <option value="粒">粒</option>
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="支">支</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-helper text-gray-secondary mb-2">服药频率 *</label>
              <select
                value={formData.frequency}
                onChange={(e) => handleChange('frequency', e.target.value)}
                className="input-field w-full"
              >
                {frequencies.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">提醒设置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-helper text-gray-secondary mb-2">提醒时间 *</label>
              <div className="space-y-2">
                {formData.reminderTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateReminderTime(index, e.target.value)}
                      className="input-field flex-1"
                      required
                    />
                    {formData.reminderTimes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeReminderTime(index)}
                        className="p-2 text-gray-secondary hover:text-danger"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addReminderTime}
                  className="btn-secondary w-full flex items-center justify-center gap-1"
                >
                  <Plus size={16} />
                  添加提醒时间
                </button>
              </div>
            </div>
            <div>
              <label className="block text-helper text-gray-secondary mb-2">提前提醒（分钟）</label>
              <select
                value={formData.reminderMinutesBefore}
                onChange={(e) => handleChange('reminderMinutesBefore', parseInt(e.target.value))}
                className="input-field w-full"
              >
                <option value={0}>准时</option>
                <option value={5}>提前5分钟</option>
                <option value={10}>提前10分钟</option>
                <option value={15}>提前15分钟</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-medication w-full">
          {loading ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  )
}
