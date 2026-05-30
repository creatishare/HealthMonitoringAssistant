import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Camera,
  ChevronRight,
  Edit3,
  FileText,
  FlaskConical,
  History,
  Upload,
} from 'lucide-react'
import HealthRecordForm from '../components/health/HealthRecordForm'
import { healthRecordApi } from '../services/api'
import {
  getRecordSummary,
  getRecordType,
  type HealthRecordFormMode,
  type HealthRecordLike,
  type HealthRecordPayload,
} from '../services/healthRecordFields'
import { formatShortAppDate } from '../utils/appDate'
import toast from 'react-hot-toast'

interface HealthRecord extends HealthRecordLike {
  id: string
}

function formatShortDate(dateStr: string) {
  return formatShortAppDate(dateStr)
}

export default function Records() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<HealthRecordFormMode>('daily')
  const [showAllRecords, setShowAllRecords] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [])

  const visibleRecords = showAllRecords ? records : records.slice(0, 3)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const response: any = await healthRecordApi.getList({ pageSize: 20 })
      setRecords(response.data?.list ?? [])
    } catch (error) {
      toast.error('获取记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRecord = async (payload: HealthRecordPayload) => {
    try {
      await healthRecordApi.create(payload)
      toast.success('保存成功')
      await fetchRecords()
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败')
      throw error
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

        <div className="mt-6">
          <HealthRecordForm
            mode={mode}
            resetAfterSubmit
            onSubmit={handleCreateRecord}
          />
        </div>
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
