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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title font-semibold text-gray-text-primary">健康记录</h1>
        <button
          onClick={() => navigate('/records/new')}
          className="btn-primary flex items-center gap-1 px-4 py-2"
        >
          <Plus size={18} />
          新增
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-secondary">暂无记录</p>
          <button
            onClick={() => navigate('/records/new')}
            className="text-primary mt-2"
          >
            添加第一条记录
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              onClick={() => navigate(`/records/${record.id}`)}
              className="card cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center">
                    <Calendar size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-gray-text-primary">
                      {formatDate(record.recordDate)}
                    </p>
                    <p className="text-small text-gray-secondary mt-0.5">
                      {record.creatinine && `肌酐 ${record.creatinine}`}
                      {record.urea && ` · 尿素 ${record.urea}`}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-secondary" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
