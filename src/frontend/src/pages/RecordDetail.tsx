import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Calendar, Edit, Trash2 } from 'lucide-react'
import { healthRecordApi } from '../services/api'
import {
  ALL_HEALTH_RECORD_FIELDS,
  extractHeartRateFromNotes,
  stripHeartRateFromNotes,
  type HealthRecordFieldKey,
  type HealthRecordLike,
} from '../services/healthRecordFields'
import { formatAppChineseDate } from '../utils/appDate'
import toast from 'react-hot-toast'

interface HealthRecord extends HealthRecordLike {
  id: string
}

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
    return formatAppChineseDate(dateStr)
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

  const visibleMetrics = ALL_HEALTH_RECORD_FIELDS.map((field) => {
    const value = field.key === 'heartRate'
      ? record.heartRate ?? extractHeartRateFromNotes(record.notes)
      : record[field.key as HealthRecordFieldKey]

    return value !== null && value !== undefined && value !== ''
      ? { ...field, value }
      : null
  }).filter(Boolean) as Array<typeof ALL_HEALTH_RECORD_FIELDS[number] & { value: string | number }>

  const cleanNotes = stripHeartRateFromNotes(record.notes)

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
      {visibleMetrics.length > 0 && (
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-4">检测指标</h2>
          <div className="grid grid-cols-2 gap-4">
            {visibleMetrics.map((metric) => (
              <div key={metric.key} className="p-3 bg-gray-bg rounded-lg">
                <p className="text-small text-gray-secondary">{metric.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-metric text-gray-text-primary">
                    {metric.value}
                  </p>
                  <span className="text-small text-gray-secondary">{metric.unit}</span>
                </div>
                {metric.key === 'tacrolimus' && (
                  <p className="mt-1 text-xs text-gray-helper">
                    以移植医生设定目标范围为准
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 备注 */}
      {cleanNotes && (
        <div className="card">
          <h2 className="text-card-title font-medium text-gray-text-primary mb-2">备注</h2>
          <p className="text-body text-gray-secondary whitespace-pre-line">{cleanNotes}</p>
        </div>
      )}
    </div>
  )
}
