import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Info, Trash2, FileText, ClipboardList, Pill } from 'lucide-react'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'
import { alertApi } from '../services/api'
import { getAlertActions, type AlertAction, type AlertActionSource } from '../services/alertActions'
import { downloadFollowUpReport, getApiErrorMessage } from '../services/reportDownload'
import { formatAppMonthDayTime } from '../utils/appDate'
import toast from 'react-hot-toast'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info'
  type?: 'metric' | 'medication' | 'system' | string
  message: string
  suggestion?: string
  isRead: boolean
  createdAt: string
  recordId?: string | null
  metric?: string | null
  medicationId?: string | null
  medicationLogId?: string | null
}

const levelConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'text-danger',
    cardBg: 'bg-red-50/90 dark:bg-red-950/25',
    chipBg: 'bg-red-100/80 dark:bg-red-950/50',
    statBg: 'bg-red-50 dark:bg-red-950/25',
    borderColor: 'border-danger/80',
    label: '严重',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    cardBg: 'bg-yellow-50/90 dark:bg-yellow-950/25',
    chipBg: 'bg-yellow-100/80 dark:bg-yellow-950/50',
    statBg: 'bg-yellow-50 dark:bg-yellow-950/25',
    borderColor: 'border-warning/80',
    label: '警告',
  },
  info: {
    icon: Info,
    color: 'text-primary',
    cardBg: 'bg-blue-50/90 dark:bg-primary/10',
    chipBg: 'bg-blue-100/80 dark:bg-primary/15',
    statBg: 'bg-blue-50 dark:bg-primary/10',
    borderColor: 'border-primary/80',
    label: '提示',
  },
}

const actionIcons = {
  record: ClipboardList,
  medication: Pill,
  report: FileText,
  read: CheckCircle,
}

export default function Alerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState({ critical: 0, warning: 0, info: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const hasReadAlerts = alerts.some((alert) => alert.isRead)

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
      toast.success('已删除')
      fetchAlerts()
      fetchUnreadCount()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handleDeleteRead = async () => {
    try {
      const response: any = await alertApi.deleteRead()
      const count = response.data?.count ?? 0
      toast.success(count > 0 ? `已删除${count}条已读消息` : '暂无已读消息')
      fetchAlerts()
      fetchUnreadCount()
    } catch (error) {
      toast.error('删除已读消息失败')
    }
  }

  const handleAlertAction = async (alert: AlertActionSource, action: AlertAction) => {
    if (action.kind === 'record' || action.kind === 'medication') {
      navigate(action.to)
      return
    }

    setActionLoading(`${alert.id}:${action.kind}`)
    try {
      if (action.kind === 'report') {
        await downloadFollowUpReport()
        toast.success('报告已生成')
      } else {
        await alertApi.markAsRead(alert.id)
        toast.success('已标记为已读')
        await Promise.all([fetchAlerts(), fetchUnreadCount()])
      }
    } catch (error) {
      const fallback = action.kind === 'report' ? '报告生成失败，请稍后重试' : '操作失败'
      toast.error(await getApiErrorMessage(error, fallback))
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return formatAppMonthDayTime(dateStr)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-page-title font-semibold text-gray-text-primary">预警中心</h1>
        </div>
        <div className="flex items-center gap-3">
          {hasReadAlerts && (
            <button
              onClick={handleDeleteRead}
              className="flex items-center gap-1 text-small text-gray-text-secondary"
            >
              <Trash2 size={16} />
              删除已读
            </button>
          )}
          {unreadCount.total > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-small text-primary"
            >
              <CheckCircle size={16} />
              全部已读
            </button>
          )}
        </div>
      </div>

      {/* 未读统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${levelConfig.critical.statBg} rounded-card p-3 text-center`}>
          <p className="text-metric text-danger">{unreadCount.critical}</p>
          <p className="text-small text-gray-text-secondary">严重</p>
        </div>
        <div className={`${levelConfig.warning.statBg} rounded-card p-3 text-center`}>
          <p className="text-metric text-warning">{unreadCount.warning}</p>
          <p className="text-small text-gray-text-secondary">警告</p>
        </div>
        <div className={`${levelConfig.info.statBg} rounded-card p-3 text-center`}>
          <p className="text-metric text-primary">{unreadCount.info}</p>
          <p className="text-small text-gray-text-secondary">提示</p>
        </div>
      </div>

      {/* 预警列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle size={48} className="text-success mx-auto mb-4" />
          <p className="text-gray-text-secondary">暂无预警</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = levelConfig[alert.level]
            const Icon = config.icon
            const actions = getAlertActions(alert)

            return (
              <div
                key={alert.id}
                className={`rounded-card border border-gray-border p-4 shadow-card backdrop-blur-xl md:p-5 border-l-4 ${config.borderColor} ${config.cardBg} ${
                  alert.isRead ? 'brightness-95 dark:brightness-90' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon size={20} className={config.color} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-small font-medium ${config.chipBg} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-small text-gray-text-helper">{formatDate(alert.createdAt)}</span>
                    </div>
                    <p className="text-body text-gray-text-primary mt-2">{alert.message}</p>
                    {alert.suggestion && (
                      <p className="mt-1 text-small text-gray-text-secondary">{alert.suggestion}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-border/50 pt-3">
                  {actions.map((action) => {
                    const ActionIcon = actionIcons[action.kind]
                    const loadingKey = `${alert.id}:${action.kind}`
                    return (
                      <button
                        key={action.kind}
                        type="button"
                        onClick={() => handleAlertAction(alert, action)}
                        disabled={actionLoading === loadingKey}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-border bg-gray-card px-3 text-small font-medium text-gray-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ActionIcon size={14} />
                        {actionLoading === loadingKey ? '处理中' : action.label}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-small text-gray-text-secondary"
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
