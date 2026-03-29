import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react'
import { alertApi } from '../services/api'
import toast from 'react-hot-toast'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info'
  message: string
  suggestion?: string
  isRead: boolean
  createdAt: string
}

const levelConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'text-danger',
    bgColor: 'bg-red-50',
    borderColor: 'border-danger',
    label: '严重',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-warning',
    label: '警告',
  },
  info: {
    icon: Info,
    color: 'text-primary',
    bgColor: 'bg-blue-50',
    borderColor: 'border-primary',
    label: '提示',
  },
}

export default function Alerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState({ critical: 0, warning: 0, info: 0, total: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAlerts()
    fetchUnreadCount()
  }, [])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const response: any = await alertApi.getList()
      setAlerts(response.data.list)
    } catch (error) {
      toast.error('获取预警列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response: any = await alertApi.getUnreadCount()
      setUnreadCount(response.data)
    } catch (error) {
      console.error('获取未读数量失败')
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await alertApi.markAsRead(id)
      fetchAlerts()
      fetchUnreadCount()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await alertApi.markAllAsRead()
      toast.success('已全部标记为已读')
      fetchAlerts()
      fetchUnreadCount()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await alertApi.delete(id)
      fetchAlerts()
      fetchUnreadCount()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} className="text-gray-text-primary" />
          </button>
          <h1 className="text-page-title font-semibold text-gray-text-primary">预警中心</h1>
        </div>
        {unreadCount.total > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-small text-primary flex items-center gap-1"
          >
            <CheckCircle size={16} />
            全部已读
          </button>
        )}
      </div>

      {/* 未读统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <p className="text-metric text-danger">{unreadCount.critical}</p>
          <p className="text-small text-gray-secondary">严重</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <p className="text-metric text-warning">{unreadCount.warning}</p>
          <p className="text-small text-gray-secondary">警告</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-metric text-primary">{unreadCount.info}</p>
          <p className="text-small text-gray-secondary">提示</p>
        </div>
      </div>

      {/* 预警列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle size={48} className="text-success mx-auto mb-4" />
          <p className="text-gray-secondary">暂无预警</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = levelConfig[alert.level]
            const Icon = config.icon

            return (
              <div
                key={alert.id}
                className={`card border-l-4 ${config.borderColor} ${config.bgColor} ${
                  alert.isRead ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon size={20} className={config.color} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-small px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-small text-gray-helper">{formatDate(alert.createdAt)}</span>
                    </div>
                    <p className="text-body text-gray-text-primary mt-2">{alert.message}</p>
                    {alert.suggestion && (
                      <p className="text-small text-gray-secondary mt-1">{alert.suggestion}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-border/50">
                  {!alert.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="text-small text-primary flex items-center gap-1"
                    >
                      <CheckCircle size={14} />
                      标记已读
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="text-small text-gray-secondary flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
