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
  { key: 'creatinine', name: '肌酐', unit: 'μmol/L', color: '#3E63DD' },
  { key: 'urea', name: '尿素氮', unit: 'mmol/L', color: '#2F9E6D' },
  { key: 'potassium', name: '血钾', unit: 'mmol/L', color: '#D98E04' },
  { key: 'uricAcid', name: '尿酸', unit: 'μmol/L', color: '#6F5BD3' },
  { key: 'tacrolimus', name: '他克莫司', unit: 'ng/mL', color: '#D9485F' },
  { key: 'hemoglobin', name: '血红蛋白', unit: 'g/L', color: '#C65D7B' },
  { key: 'bloodSugar', name: '血糖', unit: 'mmol/L', color: '#E27A3F' },
  { key: 'weight', name: '体重', unit: 'kg', color: '#2D9C9B' },
  { key: 'bloodPressureSystolic', name: '收缩压', unit: 'mmHg', color: '#4C6FFF' },
  { key: 'bloodPressureDiastolic', name: '舒张压', unit: 'mmHg', color: '#73A942' },
  { key: 'sodium', name: '血钠', unit: 'mmol/L', color: '#2FA7A1' },
  { key: 'phosphorus', name: '血磷', unit: 'mmol/L', color: '#D7A22A' },
  { key: 'urineVolume', name: '尿量', unit: 'ml', color: '#3157C8' },
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

  useEffect(() => {
    if (data?.user?.userType && !hasInitializedMetrics) {
      const recommended = getRecommendedMetrics(data.user.userType, data.user.primaryDisease)
      setSelectedMetrics(recommended)
      setHasInitializedMetrics(true)
    }
  }, [data?.user?.userType, data?.user?.primaryDisease, hasInitializedMetrics])

  const fetchTrendData = async (signal?: AbortSignal) => {
    setTrendLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const allMetricKeys = ALL_METRICS.map((m) => m.key).join(',')
      const response: any = await healthRecordApi.getTrends(
        {
          metrics: allMetricKeys,
          startDate,
          endDate,
        },
        { signal }
      )

      setTrendData(response.data?.data || response.data || [])
    } catch (error: any) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') return
      console.error('获取趋势数据失败', error)
    } finally {
      setTrendLoading(false)
    }
  }

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricKey) ? prev.filter((m) => m !== metricKey) : [...prev, metricKey]
    )
  }

  const handleMarkTaken = async (medicationId: string, scheduledTime: string) => {
    try {
      await medicationApi.recordLog({
        medicationId,
        scheduledTime: new Date(`${new Date().toISOString().split('T')[0]}T${scheduledTime}:00`).toISOString(),
        status: 'taken',
        actualTime: new Date().toISOString(),
      })
      toast.success('已标记为服用')
      fetchDashboard()
    } catch (error) {
      toast.error('标记失败，请重试')
    }
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  const { user, today, medications, alerts, recentMetrics } = data

  const sortedMedications = [...medications].sort((a: any, b: any) => {
    if (a.status === 'taken' && b.status !== 'taken') return 1
    if (a.status !== 'taken' && b.status === 'taken') return -1

    const timeA = a.scheduledTime || '00:00'
    const timeB = b.scheduledTime || '00:00'
    return timeA.localeCompare(timeB)
  })

  const hasTrendData = trendData.length > 0 && selectedMetrics.some((m) => trendData.some((d) => d[m as keyof TrendData] !== undefined && d[m as keyof TrendData] !== null))

  const recommended = getRecommendedMetrics(data?.user?.userType, data?.user?.primaryDisease)
  const visibleMetrics = showMoreMetrics ? ALL_METRICS : ALL_METRICS.filter((m) => recommended.includes(m.key))

  const getMetricTone = (status?: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'border-danger/20 bg-red-50/85 text-danger dark:bg-red-950/20'
      case 'warning':
        return 'border-warning/20 bg-yellow-50/85 text-warning dark:bg-yellow-950/20'
      case 'normal':
        return 'border-success/20 bg-emerald-50/85 text-success dark:bg-emerald-950/20'
      default:
        return 'border-gray-border bg-white/55 text-gray-text-secondary dark:bg-slate-900/34'
    }
  }

  return (
    <div className="page-shell">
      <section className="card overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-5 p-5 md:p-7">
            <div className="page-header">
              <div>
                <p className="section-kicker">今日概览</p>
                <h1 className="mt-2 text-title text-gray-text-primary">{user.greeting}，{user.name || '用户'}</h1>
                <p className="mt-2 max-w-xl text-helper text-gray-text-secondary">{today.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/insights')}
                  className="btn-secondary h-11 whitespace-nowrap rounded-full px-4"
                >
                  <Sparkles size={16} />
                  洞察
                </button>
                <button
                  onClick={() => navigate('/alerts')}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-border bg-white/65 text-gray-text-secondary backdrop-blur-xl transition-colors hover:text-primary dark:bg-white/5"
                >
                  <Bell size={20} />
                  {alerts.length > 0 && <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-danger" />}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="体重"
                value={today.checkIn.weight.recorded ? (today.checkIn.weight.value ?? '--') : '--'}
                unit="kg"
                toneClass={getMetricTone(today.checkIn.weight.status)}
                onClick={() => navigate('/records/new?type=weight')}
              />
              <MetricCard
                label="尿量"
                value={today?.checkIn?.urineVolume?.recorded ? (today.checkIn.urineVolume.value ?? '--') : '--'}
                unit="ml"
                toneClass={getMetricTone(today?.checkIn?.urineVolume?.status)}
                onClick={() => navigate('/records/new?type=urineVolume')}
              />
              <MetricCard
                label="血压"
                value={today.checkIn.bloodPressure.recorded ? `${today.checkIn.bloodPressure.systolic}/${today.checkIn.bloodPressure.diastolic}` : '--/--'}
                unit="mmHg"
                valueClassName="text-[1.05rem] md:text-[1.15rem]"
                toneClass={getMetricTone(today.checkIn.bloodPressure.status)}
                onClick={() => navigate('/records/new?type=bloodPressure')}
              />
            </div>
          </div>

          <div className="border-t border-gray-border/80 bg-primary/5 p-5 md:p-7 lg:border-l lg:border-t-0 dark:bg-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker">快速入口</p>
                <h2 className="mt-2 text-card-title text-gray-text-primary">今天的操作节奏</h2>
              </div>
              <button onClick={() => navigate('/records/new')} className="btn-primary h-11 rounded-full px-4">
                <Plus size={18} />
                录入
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <QuickPanel
                title="记录健康指标"
                description="补录今天的体重、尿量或血压，保持趋势连续。"
                actionLabel="去录入"
                onClick={() => navigate('/records/new')}
              />
              <QuickPanel
                title="查看完整趋势"
                description="切到图表页对比近 7 天、30 天和 3 个月变化。"
                actionLabel="看趋势"
                onClick={() => navigate('/charts')}
              />
            </div>
          </div>
        </div>
      </section>

      {sortedMedications.some((med: any) => med.status !== 'taken') && (
        <section className="card-medication">
          <div className="page-header">
            <div>
              <p className="section-kicker text-medication">用药提醒</p>
              <h2 className="mt-2 text-card-title text-gray-text-primary">待完成的服药事项</h2>
            </div>
            <button onClick={() => navigate('/medications')} className="chip text-medication">
              查看全部
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {sortedMedications
              .filter((med: any) => med.status !== 'taken')
              .slice(0, 3)
              .map((med: any) => (
                <div key={med.medicationId} className="flex flex-col gap-3 rounded-[22px] border border-white/50 bg-white/72 p-4 dark:border-white/8 dark:bg-white/5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-medication/12 text-medication">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-body font-medium text-gray-text-primary">{med.name}</p>
                      <p className="text-helper text-gray-text-secondary">{med.dosage}{med.dosageUnit} · {med.scheduledTime}</p>
                    </div>
                  </div>
                  <button onClick={() => handleMarkTaken(med.medicationId, med.scheduledTime)} className="btn-medication h-10 rounded-full px-4 text-helper">
                    已服用
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}

      {alerts.length > 0 && (
        <section className="space-y-3">
          <div>
            <p className="section-kicker">预警提示</p>
            <h2 className="mt-2 text-card-title text-gray-text-primary">需要关注的提醒</h2>
          </div>
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className={
                alert.level === 'critical'
                  ? 'card-alert-critical flex items-start gap-3'
                  : alert.level === 'warning'
                    ? 'card-alert-warning flex items-start gap-3'
                    : 'card-alert-info flex items-start gap-3'
              }
            >
              <div className="mt-0.5">
                <AlertTriangle size={18} className={alert.level === 'critical' ? 'text-danger' : alert.level === 'warning' ? 'text-warning' : 'text-primary'} />
              </div>
              <p className="flex-1 text-body text-gray-text-primary">{alert.message}</p>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="card">
          <div className="page-header">
            <div>
              <p className="section-kicker">趋势观察</p>
              <h2 className="mt-2 text-card-title text-gray-text-primary">指标趋势</h2>
            </div>
            <button onClick={() => navigate('/charts')} className="chip text-primary">
              查看详情
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {visibleMetrics.map((metric) => (
              <button
                key={metric.key}
                onClick={() => toggleMetric(metric.key)}
                className={`chip ${selectedMetrics.includes(metric.key) ? 'chip-active' : ''}`}
                style={selectedMetrics.includes(metric.key) ? { backgroundColor: metric.color } : undefined}
              >
                {metric.name}
              </button>
            ))}
            <button onClick={() => setShowMoreMetrics((v) => !v)} className={`chip ${showMoreMetrics ? 'chip-active' : ''}`}>
              {showMoreMetrics ? '收起' : '更多'}
            </button>
          </div>

          <div className="mt-5 h-56 md:h-72">
            {trendLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(145,161,196,0.28)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#8A94AB' }}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getMonth() + 1}/${date.getDate()}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#8A94AB' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.96)',
                      border: '1px solid rgba(145,161,196,0.24)',
                      borderRadius: '16px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => {
                      const date = new Date(label)
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                    }}
                    formatter={(value: any, name: string) => {
                      const metric = ALL_METRICS.find((m) => m.key === name)
                      return [`${value} ${metric?.unit || ''}`, metric?.name || name]
                    }}
                  />
                  {selectedMetrics.map((metricKey) => {
                    const metric = ALL_METRICS.find((m) => m.key === metricKey)
                    if (!metric) return null
                    return (
                      <Line
                        key={metricKey}
                        type="monotone"
                        dataKey={metricKey}
                        name={metricKey}
                        stroke={metric.color}
                        strokeWidth={2.5}
                        dot={{ fill: metric.color, strokeWidth: 0, r: 3.5 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-gray-text-secondary">
                <TrendingUp size={40} className="mb-3 opacity-30" />
                <p className="text-body">暂无趋势数据</p>
                <p className="mt-1 text-small">录入更多健康记录后查看趋势</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="page-header">
            <div>
              <p className="section-kicker">近期结果</p>
              <h2 className="mt-2 text-card-title text-gray-text-primary">最近指标</h2>
            </div>
            <button onClick={() => navigate('/records')} className="chip text-primary">
              查看全部
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {recentMetrics.map((metric: any) => (
              <button key={metric.key} onClick={() => navigate('/charts')} className="metric-panel text-left">
                <p className="text-helper text-gray-text-secondary">{metric.name}</p>
                <p className="mt-2 text-metric text-gray-text-primary">
                  {metric.value}
                  <span className="ml-1 text-small text-gray-text-secondary">{metric.unit}</span>
                </p>
                <p className="mt-1 text-small text-gray-text-helper">{metric.date}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <button onClick={() => navigate('/records/new')} className="btn-primary w-full">
        <Plus size={20} />
        录入新指标
      </button>
    </div>
  )
}

function MetricCard({
  label,
  value,
  unit,
  toneClass,
  onClick,
  valueClassName,
}: {
  label: string
  value: string | number
  unit: string
  toneClass: string
  onClick: () => void
  valueClassName?: string
}) {
  return (
    <button onClick={onClick} className={`metric-panel border ${toneClass} text-left`}>
      <p className="text-small font-medium">{label}</p>
      <p className={`mt-3 whitespace-nowrap font-semibold ${valueClassName ?? 'text-metric'}`}>
        {value}
        <span className="ml-1 text-xs font-medium">{unit}</span>
      </p>
    </button>
  )
}

function QuickPanel({
  title,
  description,
  actionLabel,
  onClick,
}: {
  title: string
  description: string
  actionLabel: string
  onClick: () => void
}) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/72 p-4 backdrop-blur-xl dark:border-white/8 dark:bg-white/5">
      <p className="text-body font-medium text-gray-text-primary">{title}</p>
      <p className="mt-2 text-helper text-gray-text-secondary">{description}</p>
      <button onClick={onClick} className="mt-4 inline-flex items-center gap-1 text-helper font-medium text-primary">
        {actionLabel}
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
