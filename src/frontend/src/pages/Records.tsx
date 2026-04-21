import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Calendar } from 'lucide-react'
import { healthRecordApi } from '../services/api'
import toast from 'react-hot-toast'

interface HealthRecord {
  id: string
  recordDate: string
  creatinine?: number
  urea?: number
  potassium?: number
  uricAcid?: number
  hemoglobin?: number
  weight?: number
}

export default function Records() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const response: any = await healthRecordApi.getList()
      setRecords(response.data.list)
    } catch (error) {
      toast.error('获取记录失败')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="section-kicker">记录管理</p>
          <h1 className="mt-2 text-page-title text-gray-text-primary">健康记录</h1>
          <p className="mt-1 text-helper text-gray-text-secondary">查看最近化验和日常打卡，按时间追踪变化。</p>
        </div>
        <button onClick={() => navigate('/records/new')} className="btn-primary shrink-0">
          <Plus size={18} />
          新增
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-14">
          <p className="text-body text-gray-text-primary">暂无记录</p>
          <p className="mt-2 text-helper text-gray-text-secondary">从第一条数据开始，系统才能更好展示趋势。</p>
          <div className="mt-5">
            <button onClick={() => navigate('/records/new')} className="btn-primary">
              添加第一条记录
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {records.map((record) => (
            <button
              key={record.id}
              onClick={() => navigate(`/records/${record.id}`)}
              className="card flex items-center justify-between text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-body font-medium text-gray-text-primary">{formatDate(record.recordDate)}</p>
                  <p className="mt-1 text-helper text-gray-text-secondary">
                    {record.creatinine && `肌酐 ${record.creatinine}`}
                    {record.urea && ` · 尿素 ${record.urea}`}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-text-helper" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
