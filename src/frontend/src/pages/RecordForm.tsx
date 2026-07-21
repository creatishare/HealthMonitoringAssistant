import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Camera } from 'lucide-react'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'
import HealthRecordForm from '../components/health/HealthRecordForm'
import { healthRecordApi } from '../services/api'
import {
  type HealthRecordLike,
  type HealthRecordPayload,
  type HealthRecordQuickType,
} from '../services/healthRecordFields'
import toast from 'react-hot-toast'

const QUICK_TYPES = new Set(['weight', 'bloodPressure', 'urineVolume'])

function parseQuickType(value: string | null): HealthRecordQuickType {
  return value && QUICK_TYPES.has(value) ? value as HealthRecordQuickType : null
}

export default function RecordForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const quickType = parseQuickType(searchParams.get('type'))
  const isEdit = Boolean(id)
  const isQuick = Boolean(quickType) && !isEdit
  const [loading, setLoading] = useState(isEdit)
  const [record, setRecord] = useState<HealthRecordLike | undefined>()

  useEffect(() => {
    if (isEdit && id) {
      loadRecord(id)
    }
  }, [isEdit, id])

  const loadRecord = async (recordId: string) => {
    setLoading(true)
    try {
      const response: any = await healthRecordApi.getById(recordId)
      setRecord(response.data || response)
    } catch (error) {
      toast.error('获取记录失败')
      navigate('/records')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (payload: HealthRecordPayload) => {
    try {
      if (isEdit && id) {
        await healthRecordApi.update(id, payload)
        toast.success('更新成功')
        navigate(`/records/${id}`)
      } else {
        await healthRecordApi.create(payload)
        toast.success('保存成功')
        navigate('/')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败')
      throw error
    }
  }

  const quickTitle = {
    weight: '录入体重',
    bloodPressure: '录入血压',
    urineVolume: '录入尿量',
  }

  const pageTitle = isEdit ? '编辑指标' : isQuick ? quickTitle[quickType!] : '录入指标'

  if (loading && isEdit) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
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

      <div className="card">
        <HealthRecordForm
          mode="full"
          quickType={isEdit ? null : quickType}
          initialRecord={record}
          showNotes={!isQuick}
          submitLabel={isEdit ? '更新记录' : '保存'}
          submittingLabel={isEdit ? '更新中...' : '保存中...'}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
