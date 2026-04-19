import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Bell, AlertTriangle, ChevronRight, Clock, TrendingUp, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { useDashboardStore, type UserType, type PrimaryDisease } from '../stores/dashboardStore'
import { healthRecordApi, medicationApi } from '../services/api'
import toast from 'react-hot-toast'

interface TrendData {
  date: string
  creatinine?: number
  urea?: number
  potassium?: number
  uricAcid?: number
  tacrolimus?: number
  hemoglobin?: number
  bloodSugar?: number
  weight?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  sodium?: number
  phosphorus?: number
  urineVolume?: number
}

export const ALL_METRICS = [
  { key: 'creatinine', name: '肌酐', unit: 'μmol/L', color: '#1890FF' },
  { key: 'urea', name: '尿素氮', unit: 'mmol/L', color: '#52C41A' },
  { key: 'potassium', name: '血钾', unit: 'mmol/L', color: '#FAAD14' },
  { key: 'uricAcid', name: '尿酸', unit: 'μmol/L', color: '#722ED1' },
  { key: 'tacrolimus', name: '他克莫司', unit: 'ng/mL', color: '#F5222D' },
  { key: 'hemoglobin', name: '血红蛋白', unit: 'g/L', color: '#EB2F96' },
  { key: 'bloodSugar', name: '血糖', unit: 'mmol/L', color: '#FA541C' },
  { key: 'weight', name: '体重', unit: 'kg', color: '#13C2C2' },
  { key: 'bloodPressureSystolic', name: '收缩压', unit: 'mmHg', color: '#597EF7' },
  { key: 'bloodPressureDiastolic', name: '舒张压', unit: 'mmHg', color: '#73D13D' },
  { key: 'sodium', name: '血钠', unit: 'mmol/L', color: '#36CFC9' },
  { key: 'phosphorus', name: '血磷', unit: 'mmol/L', color: '#FFC53D' },
  { key: 'urineVolume', name: '尿量', unit: 'ml', color: '#2F54EB' },
]

export function getRecommendedMetrics(userType?: UserType | null, primaryDisease?: PrimaryDisease | null): string[] {
  switch (userType) {
    case 'kidney_failure': {
      if (primaryDisease === 'diabetic_nephropathy') {
        return ['creatinine', 'urea', 'potassium', 'bloodSugar', 'weight', 'hemoglobin']
      }
      return ['creatinine', 'urea', 'potassium', 'hemoglobin', 'weight']
    }
    case 'kidney_transplant':
      return ['creatinine', 'tacrolimus', 'hemoglobin', 'uricAcid', 'weight', 'bloodPressureSystolic']
    case 'other':
      return ['creatinine', 'urea', 'uricAcid', 'weight', 'bloodPressureSystolic']
    default:
      return ['creatinine', 'urea', 'potassium', 'weight', 'hemoglobin']
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data, loading, fetchDashboard } = useDashboardStore()
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [showMoreMetrics, setShowMoreMetrics] = useState(false)
  const [hasInitializedMetrics, setHasInitializedMetrics] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetchDashboard(controller.signal).catch((err) => {
      if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') {
        toast.error('加载数据失败')
      }
    })
    fetchTrendData(controller.signal)

    return () => {
      controller.abort()
    }
  }, [location.pathname])

  // 根据用户类型初始化默认选中指标
  useEffect(() => {
    if (data?.user?.userType && !hasInitializedMetrics) {
      const recommended = getRecommendedMetrics(data.user.userType, data.user.primaryDisease)
      setSelectedMetrics(recommended)
      setHasInitializedMetrics(true)
    }
  }, [data?.user?.userType, data?.user?.primaryDisease, hasInitializedMetrics])

  // 获取趋势数据
  const fetchTrendData = async (signal?: AbortSignal) => {
    setTrendLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const allMetricKeys = ALL_METRICS.map(m => m.key).join(',')
      const response: any = await healthRecordApi.getTrends(
        {
          metrics: allMetricKeys,
          startDate,
          endDate,
        },
        { signal }
      )

      // 后端返回 { code, message, data }, axios 拦截器解包后得到 { code, message, data }
      // The data we want is inside data.data
      setTrendData(response.data?.data || response.data || [])
    } catch (error: any) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') return
      console.error('获取趋势数据失败', error)
    } finally {
      setTrendLoading(false)
    }
  }

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    )
  }

  // 标记药物已服用
  const handleMarkTaken = async (medicationId: string, scheduledTime: string) => {
    try {
      await medicationApi.recordLog({
        medicationId,
        scheduledTime: new Date(`${new Date().toISOString().split('T')[0]}T${scheduledTime}:00`).toISOString(),
        status: 'taken',
        actualTime: new Date().toISOString(),
      })
      toast.success('已标记为服用')
      fetchDashboard() // 刷新仪表盘数据
    } catch (error) {
      toast.error('标记失败，请重试')
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const { user, today, medications, alerts, recentMetrics } = data

  // 对用药进行排序：未服用的按时间远近排前面，已服用的排后面
  const sortedMedications = [...medications].sort((a: any, b: any) => {
    // 已服用的排在最后
    if (a.status === 'taken' && b.status !== 'taken') return 1
    if (a.status !== 'taken' && b.status === 'taken') return -1

    // 都未服用或都已服用，按时间排序
    const timeA = a.scheduledTime || '00:00'
    const timeB = b.scheduledTime || '00:00'
    return timeA.localeCompare(timeB)
  })

  // 检查是否有趋势数据
  const hasTrendData = trendData.length > 0 && selectedMetrics.some(m =>
    trendData.some(d => d[m as keyof TrendData] !== undefined && d[m as keyof TrendData] !== null)
  )

  const getCheckInClasses = (status?: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 text-danger'
      case 'warning':
        return 'bg-yellow-50 text-warning'
      case 'normal':
        return 'bg-green-50 text-success'
      default:
        return 'bg-gray-100 text-gray-secondary'
    }
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/insights')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-small font-medium hover:bg-primary/20 transition-colors"
          >
            <Sparkles size={14} />
            洞察
          </button>
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
      </div>

      {/* 今日打卡 */}
      <div className="card">
        <h2 className="text-card-title font-medium text-gray-text-primary mb-4">今日打卡</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* 体重 */}
          <div
            onClick={() => navigate('/records/new')}
            className={`p-3 md:p-4 rounded-lg text-center cursor-pointer transition-colors ${getCheckInClasses(
              today.checkIn.weight.status
            )}`}
          >
            <p className="text-small">体重</p>
            <p className="text-xl md:text-metric mt-1 font-semibold whitespace-nowrap">
              {today.checkIn.weight.recorded ? today.checkIn.weight.value : '--'}
              <span className="text-xs ml-1">kg</span>
            </p>
          </div>
          {/* 尿量 */}
          <div
            onClick={() => navigate('/records/new')}
            className={`p-3 md:p-4 rounded-lg text-center cursor-pointer transition-colors ${getCheckInClasses(
              today?.checkIn?.urineVolume?.status
            )}`}
          >
            <p className="text-small">尿量</p>
            <p className="text-xl md:text-metric mt-1 font-semibold whitespace-nowrap">
              {today?.checkIn?.urineVolume?.recorded ? today.checkIn.urineVolume.value : '--'}
              <span className="text-xs ml-1">ml</span>
            </p>
          </div>
          {/* 血压 */}
          <div
            onClick={() => navigate('/records/new')}
            className={`p-3 md:p-4 rounded-lg text-center cursor-pointer transition-colors ${getCheckInClasses(
              today.checkIn.bloodPressure.status
            )}`}
          >
            <p className="text-small">血压</p>
            <p className="text-base md:text-lg mt-1 font-semibold whitespace-nowrap">
              {today.checkIn.bloodPressure.recorded
                ? `${today.checkIn.bloodPressure.systolic}/${today.checkIn.bloodPressure.diastolic}`
                : '--/--'}
              <span className="text-xs ml-1">mmHg</span>
            </p>
          </div>
        </div>
      </div>

      {/* 用药提醒 - 只展示有未服用药物时 */}
      {sortedMedications.some((med: any) => med.status !== 'taken') && (
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
            {sortedMedications
              .filter((med: any) => med.status !== 'taken')
              .slice(0, 3)
              .map((med: any) => (
              <div
                key={med.medicationId}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-medication" />
                  <div>
                    <p className="text-body text-gray-text-primary">{med.name}</p>
                    <p className="text-small text-gray-secondary">
                      {med.dosage}{med.dosageUnit} · {med.scheduledTime}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleMarkTaken(med.medicationId, med.scheduledTime)}
                  className="text-small px-3 py-1.5 rounded bg-medication text-white hover:bg-medication/90 transition-colors"
                >
                  已服用
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 预警提醒 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any) => (
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

      {/* 指标趋势图表 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-card-title font-medium text-gray-text-primary">指标趋势</h2>
          </div>
          <button
            onClick={() => navigate('/charts')}
            className="text-small text-primary flex items-center"
          >
            查看详情 <ChevronRight size={16} />
          </button>
        </div>

        {/* 指标选择器 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(() => {
            const recommended = getRecommendedMetrics(data?.user?.userType, data?.user?.primaryDisease)
            const visibleMetrics = showMoreMetrics
              ? ALL_METRICS
              : ALL_METRICS.filter(m => recommended.includes(m.key))

            return (
              <>
                {visibleMetrics.map((metric) => (
                  <button
                    key={metric.key}
                    onClick={() => toggleMetric(metric.key)}
                    className={`px-3 py-1.5 rounded-full text-small transition-colors ${
                      selectedMetrics.includes(metric.key)
                        ? 'text-white'
                        : 'bg-gray-bg text-gray-secondary border border-gray-border'
                    }`}
                    style={{
                      backgroundColor: selectedMetrics.includes(metric.key) ? metric.color : undefined
                    }}
                  >
                    {metric.name}
                  </button>
                ))}
                <button
                  onClick={() => setShowMoreMetrics(v => !v)}
                  className={`px-3 py-1.5 rounded-full text-small transition-colors ${
                    showMoreMetrics
                      ? 'text-white bg-primary'
                      : 'bg-gray-bg text-gray-secondary border border-gray-border'
                  }`}
                >
                  {showMoreMetrics ? '收起' : '更多'}
                </button>
              </>
            )
          })()}
        </div>

        {/* 趋势图 */}
        <div className="h-48 md:h-64">
          {trendLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : hasTrendData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label) => {
                    const date = new Date(label)
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                  }}
                  formatter={(value: any, name: string) => {
                    const metric = ALL_METRICS.find(m => m.key === name)
                    return [`${value} ${metric?.unit || ''}`, metric?.name || name]
                  }}
                />
                {selectedMetrics.map((metricKey) => {
                  const metric = ALL_METRICS.find(m => m.key === metricKey)
                  if (!metric) return null
                  return (
                    <Line
                      key={metricKey}
                      type="monotone"
                      dataKey={metricKey}
                      name={metricKey}
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={{ fill: metric.color, strokeWidth: 0, r: 3 }}
                      connectNulls
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-secondary">
              <TrendingUp size={40} className="mb-2 opacity-30" />
              <p className="text-small">暂无趋势数据</p>
              <p className="text-xs mt-1">录入更多健康记录后查看趋势</p>
            </div>
          )}
        </div>
      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recentMetrics.map((metric: any) => (
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
