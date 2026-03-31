import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Calendar, Edit, Trash2 } from 'lucide-react'
import { healthRecordApi } from '../services/api'
import toast from 'react-hot-toast'

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
  weight?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  urineVolume?: number
  notes?: string
}

const metrics = [
  { key: 'creatinine', name: '肌酐', unit: 'μmol/L', min: 44, max: 133 },
  { key: 'urea', name: '尿素氮', unit: 'mmol/L', min: 2.6, max: 7.5 },
  { key: 'potassium', name: '血钾', unit: 'mmol/L', min: 3.5, max: 5.3 },
  { key: 'sodium', name: '血钠', unit: 'mmol/L', min: 136, max: 145 },
  { key: 'phosphorus', name: '血磷', unit: 'mmol/L', min: 0.87, max: 1.45 },
  { key: 'uricAcid', name: '尿酸', unit: 'μmol/L', min: 150, max: 420 },
  { key: 'hemoglobin', name: '血红蛋白', unit: 'g/L', min: 120, max: 160 },
  { key: 'bloodSugar', name: '血糖', unit: 'mmol/L', min: 3.9, max: 6.1 },
  { key: 'weight', name: '体重', unit: 'kg' },
  { key: 'bloodPressureSystolic', name: '收缩压', unit: 'mmHg' },
  { key: 'bloodPressureDiastolic', name: '舒张压', unit: 'mmHg' },
  { key: 'urineVolume', name: '尿量', unit: 'ml' },
]

export default function RecordDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<HealthRecord | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchRecord(id)
    }
  }, [id])

  const fetchRecord = async (recordId: string) => {
    setLoading(true)
    try {
      const response: any = await healthRecordApi.getById(recordId)
      setRecord(response.data || response)
    } catch (error) {
      toast.error('获取记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('确定要删除这条记录吗？')) return

    try {
      await healthRecordApi.delete(id)
      toast.success('删除成功')
      navigate('/records')
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-secondary">记录不存在</p>
        <button
          onClick={() => navigate('/records')}
          className="text-primary mt-2"
        >
          返回列表
        </button>
      </div>
    )
  }

  const hasMetrics = metrics.filter(m => record[m.key as keyof HealthRecord] !== null && record[m.key as keyof HealthRecord] !== undefined)

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} className="text-gray-text-primary" />
          </button>
          <h1 className="text-page-title font-semibold text-gray-text-primary">记录详情</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/records/${id}/edit`)}
            className="p-2 text-primary"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-danger"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* 日期 */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center">
            <Calendar size={24} className="text-primary" />
          </div>
          <div>
            <p className="text-small text-gray-secondary">记录日期</p>
            <p className="text-body font-medium text-gray-text-primary">
              {formatDate(record.recordDate)}
            </p>
          </div>
        </div>
      </div>

      {/* 指标数据 */}
      {hasMetrics.length > 0 && (
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">检测指标</h2>
          <div className="grid grid-cols-2 gap-4">
            {hasMetrics.map((metric) => {
              const value = record[metric.key as keyof HealthRecord]
              const isAbnormal = metric.max && metric.min && (
                (value as number) > metric.max || (value as number) < metric.min
              )
              return (
                <div key={metric.key} className="p-3 bg-gray-bg rounded-lg">
                  <p className="text-small text-gray-secondary">{metric.name}</p>
                  <div className="flex items-baseline gap-1">
                    <p className={`text-metric ${isAbnormal ? 'text-danger' : 'text-gray-text-primary'}`}>
                      {value}
                    </p>
                    <span className="text-small text-gray-secondary">{metric.unit}</span>
                  </div>
                  {metric.min && metric.max && (
                    <p className="text-xs text-gray-helper mt-1">
                      参考: {metric.min}-{metric.max}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 备注 */}
      {record.notes && (
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-2">备注</h2>
          <p className="text-body text-gray-secondary">{record.notes}</p>
        </div>
      )}

      {/* 血压特殊显示 */}
      {(record.bloodPressureSystolic || record.bloodPressureDiastolic) && (
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">血压</h2>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-metric text-gray-text-primary">
                {record.bloodPressureSystolic || '--'}
              </p>
              <p className="text-small text-gray-secondary">收缩压</p>
            </div>
            <span className="text-2xl text-gray-helper">/</span>
            <div className="text-center">
              <p className="text-metric text-gray-text-primary">
                {record.bloodPressureDiastolic || '--'}
              </p>
              <p className="text-small text-gray-secondary">舒张压</p>
            </div>
            <span className="text-small text-gray-secondary">mmHg</span>
          </div>
        </div>
      )}
    </div>
  )
}
