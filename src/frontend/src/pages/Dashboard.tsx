import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Bell, AlertTriangle, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import { useDashboardStore } from '../stores/dashboardStore'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, loading, fetchDashboard } = useDashboardStore()

  useEffect(() => {
    fetchDashboard().catch(() => toast.error('加载数据失败'))
  }, [])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const { user, today, medications, alerts, recentMetrics } = data

  return (
    <div className="space-y-4">
      {/* 头部问候 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-page-title font-semibold text-gray-text-primary">
            {user.greeting}，{user.name || '用户'}
          </h1>
          <p className="text-helper text-gray-secondary mt-1">{today.date}</p>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2"
        >
          <Bell size={24} className="text-gray-secondary" />
          {alerts.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
          )}
        </button>
      </div>

      {/* 今日打卡 */}
      <div className="card">
        <h2 className="text-card-title font-medium text-gray-text-primary mb-4">今日打卡</h2>
        <div className="grid grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/records/new')}
            className={`p-4 rounded-lg text-center cursor-pointer transition-colors ${
              today.checkIn.weight.recorded
                ? 'bg-green-50 text-success'
                : 'bg-gray-100 text-gray-secondary'
            }`}
          >
            <p className="text-small">体重</p>
            <p className="text-metric mt-1">
              {today.checkIn.weight.recorded ? today.checkIn.weight.value : '--'}
            </p>
          </div>
          <div
            onClick={() => navigate('/records/new')}
            className={`p-4 rounded-lg text-center cursor-pointer transition-colors ${
              today.checkIn.bloodPressure.recorded
                ? 'bg-green-50 text-success'
                : 'bg-gray-100 text-gray-secondary'
            }`}
          >
            <p className="text-small">血压</p>
            <p className="text-metric mt-1">
              {today.checkIn.bloodPressure.recorded
                ? `${today.checkIn.bloodPressure.systolic}/${today.checkIn.bloodPressure.diastolic}`
                : '--/--'}
            </p>
          </div>
          <div
            onClick={() => navigate('/records/new')}
            className={`p-4 rounded-lg text-center cursor-pointer transition-colors ${
              today.checkIn.waterIntake.recorded
                ? 'bg-green-50 text-success'
                : 'bg-gray-100 text-gray-secondary'
            }`}
          >
            <p className="text-small">饮水</p>
            <p className="text-metric mt-1">
              {today.checkIn.waterIntake.recorded ? today.checkIn.waterIntake.value : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* 用药提醒 */}
      {medications.length > 0 && (
        <div className="card-medication">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-card-title font-medium text-medication">用药提醒</h2>
            <button
              onClick={() => navigate('/medications')}
              className="text-small text-medication flex items-center"
            >
              查看全部 <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {medications.slice(0, 3).map((med) => (
              <div
                key={med.medicationId}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  {med.status === 'taken' ? (
                    <CheckCircle size={20} className="text-success" />
                  ) : (
                    <Clock size={20} className="text-medication" />
                  )}
                  <div>
                    <p className="text-body text-gray-text-primary">{med.name}</p>
                    <p className="text-small text-gray-secondary">
                      {med.dosage}{med.dosageUnit} · {med.scheduledTime}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-small px-2 py-1 rounded ${
                    med.status === 'taken'
                      ? 'bg-green-100 text-success'
                      : 'bg-medication-light text-medication'
                  }`}
                >
                  {med.status === 'taken' ? '已服' : '待服'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 预警提醒 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-card flex items-start gap-3 ${
                alert.level === 'critical'
                  ? 'bg-red-50 border-l-4 border-danger'
                  : alert.level === 'warning'
                  ? 'bg-yellow-50 border-l-4 border-warning'
                  : 'bg-blue-50 border-l-4 border-primary'
              }`}
            >
              <AlertTriangle
                size={20}
                className={
                  alert.level === 'critical'
                    ? 'text-danger'
                    : alert.level === 'warning'
                    ? 'text-warning'
                    : 'text-primary'
                }
              />
              <p className="text-body text-gray-text-primary flex-1">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* 最近指标 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-card-title font-medium text-gray-text-primary">最近指标</h2>
          <button
            onClick={() => navigate('/records')}
            className="text-small text-primary flex items-center"
          >
            查看全部 <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {recentMetrics.map((metric) => (
            <div
              key={metric.key}
              onClick={() => navigate('/charts')}
              className="p-4 bg-gray-bg rounded-lg cursor-pointer"
            >
              <p className="text-helper text-gray-secondary">{metric.name}</p>
              <p className="text-metric text-gray-text-primary mt-1">
                {metric.value}
                <span className="text-small text-gray-secondary ml-1">{metric.unit}</span>
              </p>
              <p className="text-small text-gray-helper mt-1">{metric.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 快速录入按钮 */}
      <button
        onClick={() => navigate('/records/new')}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        录入新指标
      </button>
    </div>
  )
}
