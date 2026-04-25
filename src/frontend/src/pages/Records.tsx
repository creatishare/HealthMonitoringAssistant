import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Camera,
  ChevronRight,
  Droplets,
  Edit3,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Save,
  Scale,
  Upload,
} from 'lucide-react'
import { healthRecordApi } from '../services/api'
import toast from 'react-hot-toast'

type RecordMode = 'daily' | 'lab'

interface HealthRecord {
  id: string
  recordDate: string
  creatinine?: number
  urea?: number
  potassium?: number
  sodium?: number
  phosphorus?: number
  uricAcid?: number
  hemoglobin?: number
  bloodSugar?: number
  tacrolimus?: number
  weight?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  urineVolume?: number
  notes?: string
}

const dailyFields = [
  { key: 'weight', label: '体重', unit: 'kg', icon: Scale, step: '0.1', placeholder: '62.5' },
  { key: 'urineVolume', label: '尿量', unit: 'ml', icon: Droplets, step: '1', placeholder: '1200' },
  { key: 'bloodPressureSystolic', label: '收缩压', unit: 'mmHg', icon: HeartPulse, step: '1', placeholder: '120' },
  { key: 'bloodPressureDiastolic', label: '舒张压', unit: 'mmHg', icon: HeartPulse, step: '1', placeholder: '80' },
  { key: 'heartRate', label: '心率', unit: '次/分', icon: HeartPulse, step: '1', placeholder: '72' },
]

const labFields = [
  { key: 'creatinine', label: '肌酐', unit: 'μmol/L', icon: FlaskConical, step: '0.01', placeholder: '130' },
  { key: 'urea', label: '尿素氮', unit: 'mmol/L', icon: FlaskConical, step: '0.01', placeholder: '8.2' },
  { key: 'potassium', label: '血钾', unit: 'mmol/L', icon: FlaskConical, step: '0.01', placeholder: '4.8' },
  { key: 'hemoglobin', label: '血红蛋白', unit: 'g/L', icon: FlaskConical, step: '0.01', placeholder: '120' },
  { key: 'uricAcid', label: '尿酸', unit: 'μmol/L', icon: FlaskConical, step: '0.01', placeholder: '420' },
  { key: 'tacrolimus', label: '他克莫司', unit: 'ng/mL', icon: FlaskConical, step: '0.01', placeholder: '8.0' },
]

function createInitialForm() {
  return {
    recordDate: new Date().toISOString().split('T')[0],
    weight: '',
    urineVolume: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    creatinine: '',
    urea: '',
    potassium: '',
    hemoglobin: '',
    uricAcid: '',
    tacrolimus: '',
  }
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function getRecordType(record: HealthRecord) {
  const hasLab = ['creatinine', 'urea', 'potassium', 'hemoglobin', 'uricAcid', 'tacrolimus'].some(
    (key) => record[key as keyof HealthRecord] != null
  )

  return hasLab ? '化验' : '日常'
}

function getRecordSummary(record: HealthRecord) {
  const type = getRecordType(record)
  const heartRate = record.notes?.match(/心率：(\d+(?:\.\d+)?)次\/分/)?.[1]

  if (type === '化验') {
    return [
      record.creatinine != null ? `肌酐: ${record.creatinine} μmol/L` : null,
      record.urea != null ? `尿素氮: ${record.urea} mmol/L` : null,
      record.potassium != null ? `血钾: ${record.potassium} mmol/L` : null,
      record.tacrolimus != null ? `他克莫司: ${record.tacrolimus} ng/mL` : null,
    ].filter(Boolean)
  }

  return [
    record.weight != null ? `体重: ${record.weight} kg` : null,
    record.bloodPressureSystolic != null && record.bloodPressureDiastolic != null
      ? `血压: ${record.bloodPressureSystolic}/${record.bloodPressureDiastolic} mmHg`
      : null,
    heartRate ? `心率: ${heartRate} 次/分` : null,
    record.urineVolume != null ? `尿量: ${record.urineVolume} ml` : null,
  ].filter(Boolean)
}

export default function Records() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<RecordMode>('daily')
  const [formData, setFormData] = useState(createInitialForm)
  const [showAllRecords, setShowAllRecords] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [])

  const visibleFields = useMemo(() => (mode === 'daily' ? dailyFields : labFields), [mode])
  const visibleRecords = showAllRecords ? records : records.slice(0, 3)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const response: any = await healthRecordApi.getList({ pageSize: 20 })
      setRecords(response.data.list)
    } catch (error) {
      toast.error('获取记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    try {
      const data = {
        recordDate: formData.recordDate,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        urineVolume: formData.urineVolume ? parseInt(formData.urineVolume) : undefined,
        bloodPressureSystolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic) : undefined,
        bloodPressureDiastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic) : undefined,
        notes: formData.heartRate ? `心率：${formData.heartRate}次/分` : undefined,
        creatinine: formData.creatinine ? parseFloat(formData.creatinine) : undefined,
        urea: formData.urea ? parseFloat(formData.urea) : undefined,
        potassium: formData.potassium ? parseFloat(formData.potassium) : undefined,
        hemoglobin: formData.hemoglobin ? parseFloat(formData.hemoglobin) : undefined,
        uricAcid: formData.uricAcid ? parseFloat(formData.uricAcid) : undefined,
        tacrolimus: formData.tacrolimus ? parseFloat(formData.tacrolimus) : undefined,
      }

      await healthRecordApi.create(data)
      toast.success('保存成功')
      setFormData(createInitialForm())
      fetchRecords()
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-title text-gray-text-primary">健康记录</h1>
        <p className="mt-2 text-helper text-gray-text-secondary">记录您的日常健康数据</p>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary/10 via-white/78 to-success/10 p-5 md:p-7 dark:from-primary/18 dark:via-white/5 dark:to-success/10">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-primary/15 text-primary">
              <FileText size={34} />
            </div>
            <div className="min-w-0">
              <h2 className="text-page-title text-gray-text-primary">智能识别检测报告</h2>
              <p className="mt-1 text-helper text-gray-text-secondary">拍照或上传检测报告，自动识别关键指标</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/records/ocr')} className="btn-primary">
              <Camera size={18} />
              拍照识别
            </button>
            <button onClick={() => navigate('/records/ocr')} className="btn-secondary">
              <Upload size={18} />
              上传图片
            </button>
          </div>
        </div>
      </section>

      <section className="card p-5 md:p-7">
        <h2 className="text-page-title text-gray-text-primary">手动录入</h2>

        <div className="mt-6 rounded-[22px] bg-primary/5 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setMode('daily')}
              className={`flex h-12 items-center justify-center gap-2 rounded-[18px] text-body font-semibold transition-all ${mode === 'daily' ? 'bg-gray-card text-gray-text-primary shadow-sm' : 'text-gray-text-secondary'}`}
            >
              <Activity size={18} />
              日常指标
            </button>
            <button
              onClick={() => setMode('lab')}
              className={`flex h-12 items-center justify-center gap-2 rounded-[18px] text-body font-semibold transition-all ${mode === 'lab' ? 'bg-gray-card text-gray-text-primary shadow-sm' : 'text-gray-text-secondary'}`}
            >
              <FlaskConical size={18} />
              化验指标
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-helper font-medium text-gray-text-secondary">记录日期</label>
            <input
              type="date"
              value={formData.recordDate}
              onChange={(event) => handleChange('recordDate', event.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleFields.map(({ key, label, unit, icon: Icon, step, placeholder }) => (
              <div key={key}>
                <label className="mb-2 flex items-center gap-1.5 text-helper font-medium text-gray-text-secondary">
                  <Icon size={15} />
                  {label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={step}
                    value={formData[key as keyof typeof formData]}
                    onChange={(event) => handleChange(key, event.target.value)}
                    placeholder={placeholder}
                    className="input-field pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-helper text-gray-text-secondary">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            <Save size={19} />
            {saving ? '保存中...' : '保存记录'}
          </button>
        </form>
      </section>

      <section className="card p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={20} className="text-primary" />
            <h2 className="text-page-title text-gray-text-primary">最近记录</h2>
          </div>
          <button onClick={() => setShowAllRecords((value) => !value)} className="chip">
            {showAllRecords ? '收起' : '查看全部'}
            <ChevronRight size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="py-10 text-center text-helper text-gray-text-secondary">
            暂无记录，保存第一条数据后会显示在这里。
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {visibleRecords.map((record) => {
              const recordType = getRecordType(record)
              const summary = getRecordSummary(record)

              return (
                <div key={record.id} className="rounded-[22px] border border-gray-border bg-white/54 p-4 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => navigate(`/records/${record.id}`)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-page-title text-gray-text-primary">{formatShortDate(record.recordDate)}</span>
                        <span className="text-helper text-gray-text-secondary">
                          {recordType === '化验' ? '14:20' : '08:30'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-small font-semibold ${recordType === '化验' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                          {recordType}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-helper text-gray-text-secondary">
                        {summary.length > 0 ? summary.map((item) => (
                          <span key={item}>{item}</span>
                        )) : <span>暂无可展示指标</span>}
                      </div>
                    </button>
                    <button onClick={() => navigate(`/records/${record.id}/edit`)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-text-secondary transition-colors hover:bg-primary/10 hover:text-primary" aria-label="编辑记录">
                      <Edit3 size={20} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
