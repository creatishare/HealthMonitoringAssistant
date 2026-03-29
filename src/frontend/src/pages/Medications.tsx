import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pill, Clock, ChevronRight, Pause, Play } from 'lucide-react'
import { medicationApi } from '../services/api'
import toast from 'react-hot-toast'

interface Medication {
  id: string
  name: string
  specification?: string
  dosage: number
  dosageUnit: string
  frequency: string
  reminderTimes: string[]
  status: string
}

const frequencyText: Record<string, string> = {
  once_daily: '每日1次',
  twice_daily: '每日2次',
  three_daily: '每日3次',
  every_other_day: '隔日一次',
  weekly: '每周一次',
}

export default function Medications() {
  const navigate = useNavigate()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMedications()
  }, [])

  const fetchMedications = async () => {
    setLoading(true)
    try {
      const response: any = await medicationApi.getList()
      setMedications(response.data.list)
    } catch (error) {
      toast.error('获取用药列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async (id: string) => {
    try {
      await medicationApi.pause(id)
      toast.success('已暂停提醒')
      fetchMedications()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handleResume = async (id: string) => {
    try {
      await medicationApi.resume(id)
      toast.success('已恢复提醒')
      fetchMedications()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title font-semibold text-gray-text-primary">用药管理</h1>
        <button
          onClick={() => navigate('/medications/new')}
          className="btn-medication flex items-center gap-1 px-4 py-2"
        >
          <Plus size={18} />
          添加
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medication"></div>
        </div>
      ) : medications.length === 0 ? (
        <div className="card text-center py-12">
          <Pill size={48} className="text-gray-disabled mx-auto mb-4" />
          <p className="text-gray-secondary">暂无用药提醒</p>
          <button
            onClick={() => navigate('/medications/new')}
            className="text-medication mt-2"
          >
            添加用药提醒
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <div key={med.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-medication-light rounded-full flex items-center justify-center">
                    <Pill size={20} className="text-medication" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-gray-text-primary">{med.name}</p>
                    <p className="text-small text-gray-secondary mt-0.5">
                      {med.specification} · {med.dosage}{med.dosageUnit}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={14} className="text-gray-helper" />
                      <span className="text-small text-gray-secondary">
                        {frequencyText[med.frequency]} · {med.reminderTimes.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {med.status === 'active' ? (
                    <button
                      onClick={() => handlePause(med.id)}
                      className="p-2 text-gray-secondary hover:text-warning"
                    >
                      <Pause size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResume(med.id)}
                      className="p-2 text-gray-secondary hover:text-success"
                    >
                      <Play size={18} />
                    </button>
                  )}
                  <ChevronRight size={20} className="text-gray-secondary" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-border">
                <span
                  className={`text-small px-2 py-1 rounded ${
                    med.status === 'active'
                      ? 'bg-green-100 text-success'
                      : 'bg-gray-100 text-gray-secondary'
                  }`}
                >
                  {med.status === 'active' ? '进行中' : '已暂停'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
