import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Camera } from 'lucide-react'
import { healthRecordApi } from '../services/api'
import toast from 'react-hot-toast'

type QuickType = 'weight' | 'bloodPressure' | 'urineVolume' | null

export default function RecordForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const quickType: QuickType = searchParams.get('type') as QuickType
  const isEdit = Boolean(id)
  const isQuick = Boolean(quickType) && !isEdit
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    creatinine: '',
    urea: '',
    potassium: '',
    sodium: '',
    phosphorus: '',
    uricAcid: '',
    tacrolimus: '',
    hemoglobin: '',
    bloodSugar: '',
    weight: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    urineVolume: '',
    notes: '',
  })

  useEffect(() => {
    if (isEdit && id) {
      loadRecord(id)
    }
  }, [isEdit, id])

  const loadRecord = async (recordId: string) => {
    setLoading(true)
    try {
      const response: any = await healthRecordApi.getById(recordId)
      const record = response.data || response
      setFormData({
        recordDate: record.recordDate || new Date().toISOString().split('T')[0],
        creatinine: record.creatinine != null ? String(record.creatinine) : '',
        urea: record.urea != null ? String(record.urea) : '',
        potassium: record.potassium != null ? String(record.potassium) : '',
        sodium: record.sodium != null ? String(record.sodium) : '',
        phosphorus: record.phosphorus != null ? String(record.phosphorus) : '',
        uricAcid: record.uricAcid != null ? String(record.uricAcid) : '',
        tacrolimus: record.tacrolimus != null ? String(record.tacrolimus) : '',
        hemoglobin: record.hemoglobin != null ? String(record.hemoglobin) : '',
        bloodSugar: record.bloodSugar != null ? String(record.bloodSugar) : '',
        weight: record.weight != null ? String(record.weight) : '',
        bloodPressureSystolic: record.bloodPressureSystolic != null ? String(record.bloodPressureSystolic) : '',
        bloodPressureDiastolic: record.bloodPressureDiastolic != null ? String(record.bloodPressureDiastolic) : '',
        urineVolume: record.urineVolume != null ? String(record.urineVolume) : '',
        notes: record.notes || '',
      })
    } catch (error) {
      toast.error('获取记录失败')
      navigate('/records')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        ...formData,
        creatinine: formData.creatinine ? parseFloat(formData.creatinine) : undefined,
        urea: formData.urea ? parseFloat(formData.urea) : undefined,
        potassium: formData.potassium ? parseFloat(formData.potassium) : undefined,
        sodium: formData.sodium ? parseFloat(formData.sodium) : undefined,
        phosphorus: formData.phosphorus ? parseFloat(formData.phosphorus) : undefined,
        uricAcid: formData.uricAcid ? parseFloat(formData.uricAcid) : undefined,
        tacrolimus: formData.tacrolimus ? parseFloat(formData.tacrolimus) : undefined,
        hemoglobin: formData.hemoglobin ? parseFloat(formData.hemoglobin) : undefined,
        bloodSugar: formData.bloodSugar ? parseFloat(formData.bloodSugar) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        bloodPressureSystolic: formData.bloodPressureSystolic
          ? parseInt(formData.bloodPressureSystolic)
          : undefined,
        bloodPressureDiastolic: formData.bloodPressureDiastolic
          ? parseInt(formData.bloodPressureDiastolic)
          : undefined,
        urineVolume: formData.urineVolume ? parseInt(formData.urineVolume) : undefined,
      }

      if (isEdit && id) {
        await healthRecordApi.update(id, data)
        toast.success('更新成功')
        navigate(`/records/${id}`)
      } else {
        await healthRecordApi.create(data)
        toast.success('保存成功')
        navigate('/')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const inputFields = [
    { key: 'creatinine', label: '血清肌酐', unit: 'μmol/L', placeholder: '44-133' },
    { key: 'urea', label: '尿素氮', unit: 'mmol/L', placeholder: '2.6-7.5' },
    { key: 'potassium', label: '血钾', unit: 'mmol/L', placeholder: '3.5-5.3' },
    { key: 'sodium', label: '血钠', unit: 'mmol/L', placeholder: '136-145' },
    { key: 'phosphorus', label: '血磷', unit: 'mmol/L', placeholder: '0.87-1.45' },
    { key: 'uricAcid', label: '尿酸', unit: 'μmol/L', placeholder: '男150-416/女89-357' },
    { key: 'tacrolimus', label: '他克莫司', unit: 'ng/mL', placeholder: '5-15' },
    { key: 'hemoglobin', label: '血红蛋白', unit: 'g/L', placeholder: '120-160' },
    { key: 'bloodSugar', label: '血糖', unit: 'mmol/L', placeholder: '3.9-6.1' },
  ]

  const basicFields = [
    { key: 'weight', label: '体重', unit: 'kg', placeholder: '' },
    { key: 'urineVolume', label: '本次尿量', unit: 'ml', placeholder: '本次排尿量，如：200' },
  ]

  const quickTitle = {
    weight: '录入体重',
    bloodPressure: '录入血压',
    urineVolume: '录入尿量',
  }

  const pageTitle = isEdit ? '编辑指标' : isQuick ? quickTitle[quickType!] : '录入指标'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} className="text-gray-text-primary" />
          </button>
          <h1 className="text-page-title font-semibold text-gray-text-primary">
            {pageTitle}
          </h1>
        </div>
        {!isEdit && !isQuick && (
          <button
            onClick={() => navigate('/records/ocr')}
            className="btn-primary flex items-center gap-1 px-4 py-2"
          >
            <Camera size={18} />
            拍照识别
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <label className="block text-helper text-gray-secondary mb-2">记录日期</label>
          <input
            type="date"
            value={formData.recordDate}
            onChange={(e) => handleChange('recordDate', e.target.value)}
            className="input-field w-full"
            required
          />
        </div>

        {(!isQuick || quickType === 'weight' || quickType === 'urineVolume') && (
          <div className="card">
            <h2 className="text-card-title font-medium text-gray-text-primary mb-4">
              {isQuick && quickType === 'urineVolume' ? '尿量' : '基本信息'}
            </h2>
            <div className={`grid gap-4 ${isQuick ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {basicFields
                .filter(({ key }) => !isQuick || key === quickType)
                .map(({ key, label, unit, placeholder }) => (
                  <div key={key}>
                    <label className="block text-small text-gray-secondary mb-1">
                      {label} ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={(formData as any)[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      className="input-field w-full"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {(!isQuick || quickType === 'bloodPressure') && (
          <div className="card">
            <h2 className="text-card-title font-medium text-gray-text-primary mb-4">血压</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-small text-gray-secondary mb-1">
                  收缩压/高压 <span className="text-gray-helper">(mmHg)</span>
                </label>
                <input
                  type="number"
                  value={formData.bloodPressureSystolic}
                  onChange={(e) => handleChange('bloodPressureSystolic', e.target.value)}
                  placeholder="<140"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-small text-gray-secondary mb-1">
                  舒张压/低压 <span className="text-gray-helper">(mmHg)</span>
                </label>
                <input
                  type="number"
                  value={formData.bloodPressureDiastolic}
                  onChange={(e) => handleChange('bloodPressureDiastolic', e.target.value)}
                  placeholder="<90"
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* 非快速模式下显示完整表单 */}
        {!isQuick && (
          <>
            <div className="card">
              <h2 className="text-card-title font-medium text-gray-text-primary mb-4">血液指标</h2>
              <div className="grid grid-cols-2 gap-4">
                {inputFields.map(({ key, label, unit, placeholder }) => (
                  <div key={key}>
                    <label className="block text-small text-gray-secondary mb-1">
                      {label} ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(formData as any)[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      className="input-field w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="block text-helper text-gray-secondary mb-2">备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="添加备注信息..."
                rows={3}
                className="input-field w-full resize-none"
              />
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? '保存中...' : '保存'}
        </button>
      </form>
    </div>
  )
}
