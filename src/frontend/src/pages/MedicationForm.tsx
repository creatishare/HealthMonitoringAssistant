import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, X, Trash2, ChevronRight } from 'lucide-react'
import { medicationApi } from '../services/api'
import toast from 'react-hot-toast'

const frequencies = [
  { value: 'once_daily', label: '每日1次' },
  { value: 'twice_daily', label: '每日2次' },
  { value: 'three_daily', label: '每日3次' },
  { value: 'every_other_day', label: '隔日一次' },
  { value: 'weekly', label: '每周一次' },
]

/** 常用药物清单（肾衰竭/肾移植术后） */
const COMMON_MEDICATIONS: CommonMedication[] = [
  // 免疫抑制剂
  { name: '环孢素软胶囊', specifications: ['25mg/粒', '50mg/粒'], defaultUnit: '粒' },
  { name: '他克莫司胶囊', specifications: ['0.5mg/粒', '1mg/粒'], defaultUnit: '粒' },
  { name: '吗替麦考酚酯胶囊(骁悉)', specifications: ['250mg/粒'], defaultUnit: '粒' },
  { name: '麦考酚钠肠溶片(米芙)', specifications: ['360mg/片'], defaultUnit: '片' },
  { name: '西罗莫司片', specifications: ['1mg/片'], defaultUnit: '片' },
  { name: '醋酸泼尼松片', specifications: ['5mg/片'], defaultUnit: '片' },
  // 降压药
  { name: '硝苯地平控释片(拜新同)', specifications: ['30mg/片'], defaultUnit: '片' },
  { name: '苯磺酸氨氯地平片', specifications: ['5mg/片'], defaultUnit: '片' },
  { name: '缬沙坦胶囊', specifications: ['80mg/粒'], defaultUnit: '粒' },
  { name: '盐酸贝那普利片', specifications: ['10mg/片'], defaultUnit: '片' },
  // 纠正贫血
  { name: '重组人促红素注射液', specifications: ['3000IU/支', '10000IU/支'], defaultUnit: '支' },
  { name: '罗沙司他胶囊', specifications: ['50mg/粒', '100mg/粒'], defaultUnit: '粒' },
  { name: '多糖铁复合物胶囊', specifications: ['0.15g/粒'], defaultUnit: '粒' },
  // 降磷/补钙
  { name: '碳酸镧咀嚼片', specifications: ['500mg/片'], defaultUnit: '片' },
  { name: '碳酸钙D3片', specifications: ['600mg/片'], defaultUnit: '片' },
  { name: '骨化三醇软胶囊', specifications: ['0.25μg/粒'], defaultUnit: '粒' },
  // 其他常用
  { name: '阿托伐他汀钙片', specifications: ['10mg/片', '20mg/片'], defaultUnit: '片' },
  { name: '叶酸片', specifications: ['5mg/片'], defaultUnit: '片' },
  { name: '碳酸氢钠片', specifications: ['0.5g/片'], defaultUnit: '片' },
]

interface CommonMedication {
  name: string
  specifications: string[]
  defaultUnit: string
}

/** 底部选择面板 */
function BottomSelector({
  open,
  title,
  options,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  options: { label: string; value: string; isOther?: boolean }[]
  onSelect: (value: string) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end max-w-mobile mx-auto"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" />
      {/* 面板 */}
      <div
        className="relative bg-gray-card rounded-t-2xl max-h-[60vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-border">
          <h3 className="text-body font-medium text-gray-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1">
            <X size={20} className="text-gray-secondary" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 pb-20">
          {options.map((opt) => (
            <div key={opt.value}>
              {opt.isOther && (
                <div className="mx-4 border-t border-gray-border" />
              )}
              <button
                onClick={() => {
                  onSelect(opt.value)
                  onClose()
                }}
                className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between ${
                  opt.isOther
                    ? 'bg-gray-bg hover:bg-gray-border/30 active:bg-gray-border/50'
                    : 'hover:bg-primary-light/30 active:bg-primary-light/50'
                }`}
              >
                <span className={`text-body ${opt.isOther ? 'text-gray-text-secondary' : 'text-gray-text-primary'}`}>
                  {opt.label}
                </span>
                <ChevronRight size={18} className="text-gray-secondary" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MedicationForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    specification: '',
    dosage: '',
    dosageUnit: '片',
    frequency: 'once_daily',
    reminderTimes: ['08:00'],
    reminderMinutesBefore: 5,
  })

  // 输入模式：'select' = 从列表选择，'custom' = 手动输入
  const [nameMode, setNameMode] = useState<'select' | 'custom'>('select')
  const [specMode, setSpecMode] = useState<'select' | 'custom'>('select')

  // 选择器开关
  const [nameSelectorOpen, setNameSelectorOpen] = useState(false)
  const [specSelectorOpen, setSpecSelectorOpen] = useState(false)

  // 当前选中的常用药物
  const [selectedCommonMed, setSelectedCommonMed] = useState<CommonMedication | null>(null)

  // 编辑模式时加载药物数据
  useEffect(() => {
    if (isEdit && id) {
      fetchMedication(id)
    }
  }, [isEdit, id])

  const fetchMedication = async (medicationId: string) => {
    setFetchLoading(true)
    try {
      const response: any = await medicationApi.getList()
      const medication = response.data.list.find((m: any) => m.id === medicationId)
      if (medication) {
        // 判断是否属于常用药物
        const common = COMMON_MEDICATIONS.find((m) => m.name === medication.name)
        setSelectedCommonMed(common || null)
        setNameMode(common ? 'select' : 'custom')
        setSpecMode(common && common.specifications.includes(medication.specification) ? 'select' : 'custom')
        setFormData({
          name: medication.name || '',
          specification: medication.specification || '',
          dosage: String(medication.dosage) || '',
          dosageUnit: medication.dosageUnit || '片',
          frequency: medication.frequency || 'once_daily',
          reminderTimes: medication.reminderTimes || ['08:00'],
          reminderMinutesBefore: medication.reminderMinutesBefore || 5,
        })
      } else {
        toast.error('药物不存在')
        navigate('/medications')
      }
    } catch (error) {
      toast.error('获取药物信息失败')
      navigate('/medications')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  /** 选择药品名称 */
  const handleSelectName = (value: string) => {
    if (value === '__custom__') {
      setNameMode('custom')
      setSelectedCommonMed(null)
      setSpecMode('custom')
      setFormData((prev) => ({
        ...prev,
        name: '',
        specification: '',
        dosageUnit: '片',
      }))
      return
    }
    const med = COMMON_MEDICATIONS.find((m) => m.name === value)
    if (med) {
      setNameMode('select')
      setSelectedCommonMed(med)
      setSpecMode('select')
      setFormData((prev) => ({
        ...prev,
        name: med.name,
        specification: med.specifications[0],
        dosageUnit: med.defaultUnit,
      }))
    }
  }

  /** 选择规格 */
  const handleSelectSpec = (value: string) => {
    if (value === '__custom__') {
      setSpecMode('custom')
      setFormData((prev) => ({ ...prev, specification: '' }))
      return
    }
    setSpecMode('select')
    setFormData((prev) => ({ ...prev, specification: value }))
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

  const handleDelete = async () => {
    if (!id) return
    if (window.confirm('确定要删除该用药提醒吗？此操作不可恢复。')) {
      setLoading(true)
      try {
        await medicationApi.delete(id)
        toast.success('已删除用药提醒')
        navigate('/medications')
      } catch (error: any) {
        toast.error(error.response?.data?.message || '删除失败')
        setLoading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        ...formData,
        dosage: parseFloat(formData.dosage),
      }

      if (isEdit && id) {
        await medicationApi.update(id, data)
        toast.success('修改成功')
      } else {
        await medicationApi.create(data)
        toast.success('添加成功')
      }
      navigate('/medications')
    } catch (error: any) {
      toast.error(error.response?.data?.message || (isEdit ? '修改失败' : '添加失败'))
    } finally {
      setLoading(false)
    }
  }

  // 药品名称选择器选项
  const nameOptions = [
    ...COMMON_MEDICATIONS.map((med) => ({ label: med.name, value: med.name })),
    { label: '其他（手动输入）', value: '__custom__', isOther: true },
  ]

  // 规格选择器选项（基于选中的常用药物）
  const specOptions = selectedCommonMed
    ? [
        ...selectedCommonMed.specifications.map((s) => ({ label: s, value: s })),
        { label: '其他（手动输入）', value: '__custom__', isOther: true },
      ]
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} className="text-gray-text-primary" />
          </button>
          <h1 className="text-page-title font-semibold text-gray-text-primary">
            {isEdit ? '编辑用药' : '添加用药'}
          </h1>
        </div>
        {isEdit && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="p-2 text-gray-secondary hover:text-danger flex items-center gap-1"
          >
            <Trash2 size={18} />
            <span className="text-sm">删除</span>
          </button>
        )}
      </div>

      {fetchLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medication"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card">
            <h2 className="text-card-title font-medium text-gray-text-primary mb-4">药品信息</h2>
            <div className="space-y-4">
              {/* 药品名称 */}
              <div>
                <label className="block text-helper text-gray-secondary mb-2">药品名称 *</label>
                {nameMode === 'select' && !isEdit ? (
                  <button
                    type="button"
                    onClick={() => setNameSelectorOpen(true)}
                    className="input-field w-full text-left flex items-center justify-between"
                  >
                    <span className={formData.name ? 'text-gray-text-primary' : 'text-gray-text-helper'}>
                      {formData.name || '点击选择常用药品'}
                    </span>
                    <ChevronRight size={18} className="text-gray-secondary" />
                  </button>
                ) : (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="请输入药品名称"
                    className="input-field w-full"
                    required
                  />
                )}
                {!isEdit && nameMode === 'custom' && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameMode('select')
                      setFormData((prev) => ({ ...prev, name: '' }))
                    }}
                    className="text-xs text-primary mt-1"
                  >
                    ← 返回选择常用药品
                  </button>
                )}
              </div>

              {/* 规格 */}
              <div>
                <label className="block text-helper text-gray-secondary mb-2">规格</label>
                {specMode === 'select' && selectedCommonMed ? (
                  <button
                    type="button"
                    onClick={() => setSpecSelectorOpen(true)}
                    className="input-field w-full text-left flex items-center justify-between"
                  >
                    <span className={formData.specification ? 'text-gray-text-primary' : 'text-gray-text-helper'}>
                      {formData.specification || '点击选择规格'}
                    </span>
                    <ChevronRight size={18} className="text-gray-secondary" />
                  </button>
                ) : (
                  <input
                    type="text"
                    value={formData.specification}
                    onChange={(e) => handleChange('specification', e.target.value)}
                    placeholder="如：25mg/粒"
                    className="input-field w-full"
                  />
                )}
                {specMode === 'custom' && selectedCommonMed && (
                  <button
                    type="button"
                    onClick={() => {
                      setSpecMode('select')
                      if (selectedCommonMed) {
                        setFormData((prev) => ({
                          ...prev,
                          specification: selectedCommonMed.specifications[0],
                        }))
                      }
                    }}
                    className="text-xs text-primary mt-1"
                  >
                    ← 返回选择常见规格
                  </button>
                )}
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
      )}

      {/* 药品名称选择器 */}
      <BottomSelector
        open={nameSelectorOpen}
        title="选择药品"
        options={nameOptions}
        onSelect={handleSelectName}
        onClose={() => setNameSelectorOpen(false)}
      />

      {/* 规格选择器 */}
      <BottomSelector
        open={specSelectorOpen}
        title="选择规格"
        options={specOptions}
        onSelect={handleSelectSpec}
        onClose={() => setSpecSelectorOpen(false)}
      />
    </div>
  )
}
