import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Bell, AlertTriangle, ChevronRight, Clock, TrendingUp, Sparkles, CheckCircle, FileText, ClipboardList, Pill } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts'
import { useDashboardStore, type UserType, type PrimaryDisease } from '../stores/dashboardStore'
import { alertApi, healthRecordApi, medicationApi } from '../services/api'
import { getTransplantBaselinePrompt } from '../services/transplantProfile'
import { analyzeTransplantRisk, type TransplantRiskTone } from '../services/transplantRisk/rules'
import { getAlertActions, type AlertAction, type AlertActionSource } from '../services/alertActions'
import { downloadFollowUpReport, getApiErrorMessage } from '../services/reportDownload'
import {
  getAppDateWindow,
  getFallbackScheduledAtForAppDate,
  getMillisecondsUntilNextAppDay,
} from '../utils/appDate'
import { useChartTheme } from '../utils/chartTheme'
import SegmentedControl from '../components/ui/SegmentedControl'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

interface TrendData {
  date: string
  creatinine?: number
  egfr?: number
  urea?: number
  potassium?: number
  uricAcid?: number
  tacrolimus?: number
  hemoglobin?: number
  bloodSugar?: number
  weight?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number
  sodium?: number
  phosphorus?: number
  urineVolume?: number
  urineProteinCreatinineRatio?: number
  urineAlbuminCreatinineRatio?: number
  bkVirusCopies?: number
  cmvVirusCopies?: number
  ebvVirusCopies?: number
}

interface TodayMedication {
  medicationId: string
  name: string
  dosage: number
  dosageUnit: string
  scheduledTime: string
  scheduledAt?: string
  status: string
  logId?: string
}

export const ALL_METRICS = [
  { key: 'creatinine', name: '肌酐', unit: 'μmol/L', color: '#3E63DD' },
  { key: 'egfr', name: 'eGFR', unit: 'ml/min/1.73m²', color: '#1F8A70' },
  { key: 'urea', name: '尿素氮', unit: 'mmol/L', color: '#2F9E6D' },
  { key: 'potassium', name: '血钾', unit: 'mmol/L', color: '#D98E04' },
  { key: 'uricAcid', name: '尿酸', unit: 'μmol/L', color: '#6F5BD3' },
  { key: 'tacrolimus', name: '他克莫司', unit: 'ng/mL', color: '#D9485F' },
  { key: 'hemoglobin', name: '血红蛋白', unit: 'g/L', color: '#C65D7B' },
  { key: 'bloodSugar', name: '血糖', unit: 'mmol/L', color: '#E27A3F' },
  { key: 'weight', name: '体重', unit: 'kg', color: '#2D9C9B' },
  { key: 'bloodPressureSystolic', name: '收缩压', unit: 'mmHg', color: '#4C6FFF' },
  { key: 'bloodPressureDiastolic', name: '舒张压', unit: 'mmHg', color: '#73A942' },
  { key: 'heartRate', name: '心率', unit: '次/分', color: '#E05263' },
  { key: 'sodium', name: '血钠', unit: 'mmol/L', color: '#2FA7A1' },
  { key: 'phosphorus', name: '血磷', unit: 'mmol/L', color: '#D7A22A' },
  { key: 'urineVolume', name: '尿量', unit: 'ml', color: '#3157C8' },
  { key: 'urineProteinCreatinineRatio', name: '尿蛋白/肌酐比', unit: 'mg/mg', color: '#8B6FC9' },
  { key: 'urineAlbuminCreatinineRatio', name: '尿白蛋白/肌酐比', unit: 'mg/g', color: '#C56A95' },
  { key: 'bkVirusCopies', name: 'BK病毒载量', unit: 'copies/mL', color: '#6772E5' },
  { key: 'cmvVirusCopies', name: 'CMV病毒载量', unit: 'copies/mL', color: '#B35C44' },
  { key: 'ebvVirusCopies', name: 'EBV病毒载量', unit: 'copies/mL', color: '#5B7C99' },
]

export type MetricScope = 'core' | 'recommended' | 'all'

export const METRIC_SCOPE_OPTIONS: Array<{ key: MetricScope; label: string }> = [
  { key: 'core', label: '核心' },
  { key: 'recommended', label: '推荐' },
  { key: 'all', label: '全部' },
]

export function getRecommendedMetrics(userType?: UserType | null, primaryDisease?: PrimaryDisease | null): string[] {
  switch (userType) {
    case 'kidney_failure': {
      if (primaryDisease === 'diabetic_nephropathy') {
        return ['creatinine', 'urea', 'potassium', 'bloodSugar', 'weight', 'hemoglobin']
      }
      if (primaryDisease === 'hypertensive_nephropathy') {
        return ['creatinine', 'urea', 'potassium', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'weight']
      }
      if (primaryDisease === 'chronic_glomerulonephritis') {
        return ['creatinine', 'urea', 'potassium', 'urineVolume', 'weight', 'hemoglobin']
      }
      return ['creatinine', 'urea', 'potassium', 'hemoglobin', 'weight']
    }
    case 'kidney_transplant':
      return [
        'creatinine',
        'egfr',
        'tacrolimus',
        'urineProteinCreatinineRatio',
        'urineAlbuminCreatinineRatio',
        'bkVirusCopies',
        'cmvVirusCopies',
        'ebvVirusCopies',
        'bloodPressureSystolic',
        'urineVolume',
      ]
    case 'other':
      return ['creatinine', 'urea', 'uricAcid', 'weight', 'bloodPressureSystolic']
    default:
      return ['creatinine', 'urea', 'potassium', 'weight', 'hemoglobin']
  }
}

export function getCoreMetrics(userType?: UserType | null, primaryDisease?: PrimaryDisease | null): string[] {
  if (userType === 'kidney_transplant') {
    return ['creatinine', 'egfr', 'tacrolimus']
  }

  if (primaryDisease === 'diabetic_nephropathy') {
    return ['creatinine', 'potassium', 'bloodSugar']
  }

  if (primaryDisease === 'hypertensive_nephropathy') {
    return ['creatinine', 'bloodPressureSystolic', 'bloodPressureDiastolic']
  }

  return ['creatinine', 'urea', 'potassium']
}

export function getVisibleMetricsByScope(
  scope: MetricScope,
  userType?: UserType | null,
  primaryDisease?: PrimaryDisease | null
) {
  const coreKeys = getCoreMetrics(userType, primaryDisease)
  const recommendedKeys = getRecommendedMetrics(userType, primaryDisease)
  const keys = scope === 'core' ? coreKeys : scope === 'recommended' ? recommendedKeys : ALL_METRICS.map((metric) => metric.key)
  return ALL_METRICS.filter((metric) => keys.includes(metric.key))
}

function getMetricName(metricKey: string) {
  return ALL_METRICS.find((metric) => metric.key === metricKey)?.name || metricKey
}

// 趋势图最多同时显示 2 项指标，避免多量纲共用 Y 轴把低值曲线压平
const MAX_TREND_METRICS = 2

function getRiskToneClass(tone: TransplantRiskTone) {
  switch (tone) {
    case 'red':
      return 'border-danger/20 bg-red-50/85 text-danger dark:bg-red-950/25'
    case 'yellow':
      return 'border-warning/20 bg-yellow-50/85 text-warning dark:bg-yellow-950/20'
    case 'green':
      return 'border-success/20 bg-emerald-50/85 text-success dark:bg-emerald-950/20'
    default:
      return 'border-primary/15 bg-primary/10 text-primary dark:bg-primary/10'
  }
}

function getScheduledAt(med: TodayMedication) {
  return med.scheduledAt || getFallbackScheduledAtForAppDate(med.scheduledTime)
}

const ALERT_ACTION_ICONS = {
  record: ClipboardList,
  medication: Pill,
  report: FileText,
  read: CheckCircle,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data, loading, fetchDashboard } = useDashboardStore()
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [metricScope, setMetricScope] = useState<MetricScope>('core')
  const [hasInitializedMetrics, setHasInitializedMetrics] = useState(false)
  const [alertActionLoading, setAlertActionLoading] = useState<string | null>(null)
  const chartTheme = useChartTheme()

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
    let timeoutId: ReturnType<typeof setTimeout>

    const refreshDashboard = () => {
      fetchDashboard().catch((err) => {
        if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') {
          toast.error('加载数据失败')
        }
      })
      fetchTrendData()
    }

    const scheduleNextDayRefresh = () => {
      timeoutId = setTimeout(() => {
        refreshDashboard()
        scheduleNextDayRefresh()
      }, getMillisecondsUntilNextAppDay())
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshDashboard()
      }
    }

    scheduleNextDayRefresh()
    window.addEventListener('focus', refreshDashboard)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('focus', refreshDashboard)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchDashboard])

  useEffect(() => {
    if (data?.user && !hasInitializedMetrics) {
      setSelectedMetrics(getCoreMetrics(data.user.userType, data.user.primaryDisease).slice(0, MAX_TREND_METRICS))
      setHasInitializedMetrics(true)
    }
  }, [data?.user?.userType, data?.user?.primaryDisease, hasInitializedMetrics])

  const fetchTrendData = async (signal?: AbortSignal) => {
    setTrendLoading(true)
    try {
      const { startDate, endDate } = getAppDateWindow(30)

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
    if (!selectedMetrics.includes(metricKey) && selectedMetrics.length >= MAX_TREND_METRICS) {
      toast(`趋势图最多同时显示${MAX_TREND_METRICS}项指标，已替换最早选择的指标`, { icon: 'ℹ️' })
    }
    setSelectedMetrics((prev) => {
      if (prev.includes(metricKey)) return prev.filter((m) => m !== metricKey)
      if (prev.length >= MAX_TREND_METRICS) return [...prev.slice(1), metricKey]
      return [...prev, metricKey]
    })
  }

  const handleMarkTaken = async (med: TodayMedication) => {
    try {
      await medicationApi.recordLog({
        medicationId: med.medicationId,
        scheduledTime: getScheduledAt(med),
        status: 'taken',
        actualTime: new Date().toISOString(),
      })
      toast.success('已标记为服用')
      fetchDashboard()
    } catch (error) {
      toast.error('标记失败，请重试')
    }
  }

  const handleAlertAction = async (alert: AlertActionSource, action: AlertAction) => {
    if (action.kind === 'record' || action.kind === 'medication') {
      navigate(action.to)
      return
    }

    setAlertActionLoading(`${alert.id}:${action.kind}`)
    try {
      if (action.kind === 'report') {
        await downloadFollowUpReport()
        toast.success('报告已生成')
      } else {
        await alertApi.markAsRead(alert.id)
        toast.success('已标记为已读')
        await fetchDashboard()
      }
    } catch (error) {
      const fallback = action.kind === 'report' ? '报告生成失败，请稍后重试' : '操作失败，请稍后重试'
      toast.error(await getApiErrorMessage(error, fallback))
    } finally {
      setAlertActionLoading(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const { user, today, medications, alerts, recentMetrics } = data

  const sortedMedications = [...medications].sort((a: TodayMedication, b: TodayMedication) => {
    if (a.status === 'taken' && b.status !== 'taken') return 1
    if (a.status !== 'taken' && b.status === 'taken') return -1

    const timeA = a.scheduledTime || '00:00'
    const timeB = b.scheduledTime || '00:00'
    return timeA.localeCompare(timeB)
  })

  const hasTrendData = trendData.length > 0 && selectedMetrics.some((m) => trendData.some((d) => d[m as keyof TrendData] !== undefined && d[m as keyof TrendData] !== null))

  const selectedMetricDefs = selectedMetrics
    .map((key) => ALL_METRICS.find((m) => m.key === key))
    .filter((m): m is (typeof ALL_METRICS)[number] => Boolean(m))
  // 两项指标单位不同（如血压 mmHg 与血钾 mmol/L）时启用左右双 Y 轴，避免低值曲线被压平
  const useDualYAxis = selectedMetricDefs.length === 2 && selectedMetricDefs[0].unit !== selectedMetricDefs[1].unit

  const isTransplantDashboardUser = data?.user?.userType === 'kidney_transplant' || data?.user?.hasTransplant === true
  const coreMetricKeys = getCoreMetrics(data?.user?.userType, data?.user?.primaryDisease)
  const visibleMetrics = getVisibleMetricsByScope(metricScope, data?.user?.userType, data?.user?.primaryDisease)
  const missingCoreMetricNames = coreMetricKeys
    .filter((metricKey) => !trendData.some((point) => point[metricKey as keyof TrendData] !== undefined && point[metricKey as keyof TrendData] !== null))
    .map(getMetricName)
  const trendReminder =
    isTransplantDashboardUser
      ? '移植术后趋势优先参考个人基线、连续变化和医生设定目标范围。'
      : missingCoreMetricNames.length > 0
      ? `近30天缺少${missingCoreMetricNames.slice(0, 3).join('、')}记录，复诊前建议核对报告日期。`
      : selectedMetrics.length > 4
        ? '当前图表包含多项指标，复诊沟通时可在图表页逐项查看。'
        : '核心指标已有记录，建议持续观察同一周期内的变化。'
  const transplantRiskRecords = trendData.map(({ date, ...record }) => ({
    recordDate: date,
    ...record,
  }))
  const transplantRiskReminder = isTransplantDashboardUser
    ? analyzeTransplantRisk({
      userType: data.user.userType,
      hasTransplant: data.user.hasTransplant,
      transplantDate: data.user.transplantDate,
      baselineCreatinine: data.user.baselineCreatinine,
      tacrolimusTargetMin: data.user.tacrolimusTargetMin,
      tacrolimusTargetMax: data.user.tacrolimusTargetMax,
      records: transplantRiskRecords,
    })
    : null
  const transplantBaselinePrompt = data?.user ? getTransplantBaselinePrompt(data.user) : null

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

      {sortedMedications.some((med: TodayMedication) => med.status !== 'taken') && (
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
              .filter((med: TodayMedication) => med.status !== 'taken')
              .slice(0, 3)
              .map((med: TodayMedication) => (
                <div key={`${med.medicationId}-${med.scheduledTime}`} className="flex flex-col gap-3 rounded-[22px] border border-white/50 bg-white/72 p-4 dark:border-white/8 dark:bg-white/5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-medication/12 text-medication">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-body font-medium text-gray-text-primary">{med.name}</p>
                      <p className="text-helper text-gray-text-secondary">{med.dosage}{med.dosageUnit} · {med.scheduledTime}</p>
                    </div>
                  </div>
                  <button onClick={() => handleMarkTaken(med)} className="btn-medication h-10 rounded-full px-4 text-helper">
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
          {alerts.map((alert: any) => {
            const actions = getAlertActions(alert)

            return (
              <div
                key={alert.id}
                className={
                  alert.level === 'critical'
                    ? 'card-alert-critical'
                    : alert.level === 'warning'
                      ? 'card-alert-warning'
                      : 'card-alert-info'
                }
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <AlertTriangle size={18} className={alert.level === 'critical' ? 'text-danger' : alert.level === 'warning' ? 'text-warning' : 'text-primary'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-gray-text-primary">{alert.message}</p>
                    {alert.suggestion && (
                      <p className="mt-1 text-helper text-gray-text-secondary">{alert.suggestion}</p>
                    )}
                  </div>
                </div>
                {actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-border/50 pt-3">
                    {actions.map((action) => {
                      const Icon = ALERT_ACTION_ICONS[action.kind]
                      const loadingKey = `${alert.id}:${action.kind}`
                      return (
                        <button
                          key={action.kind}
                          type="button"
                          onClick={() => handleAlertAction(alert, action)}
                          disabled={alertActionLoading === loadingKey}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-border bg-gray-card px-3 text-small font-medium text-gray-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Icon size={14} />
                          {alertActionLoading === loadingKey ? '处理中' : action.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
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

          <SegmentedControl
            className="mt-4"
            options={METRIC_SCOPE_OPTIONS.map((option) => ({ label: option.label, value: option.key }))}
            value={metricScope}
            onChange={setMetricScope}
          />

          <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-primary/15 bg-primary/10 p-3 text-helper text-gray-text-secondary dark:bg-primary/10">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-primary" />
            <p>{trendReminder}</p>
          </div>

          {transplantRiskReminder && (
            <div className={`mt-3 flex items-start gap-3 rounded-[18px] border p-3 ${getRiskToneClass(transplantRiskReminder.tone)}`}>
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-helper font-semibold">{transplantRiskReminder.title}</p>
                <p className="mt-1 text-helper text-gray-text-secondary">{transplantRiskReminder.message}</p>
                <p className="mt-1 text-small text-gray-text-helper">{transplantRiskReminder.suggestedAction}</p>
                {transplantBaselinePrompt && (
                  <button
                    type="button"
                    onClick={() => navigate('/profile/edit#disease-info')}
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-small font-semibold text-white"
                  >
                    {transplantBaselinePrompt.actionLabel}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

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
          </div>

          <div className="mt-5 h-56 md:h-72">
            {trendLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(145,161,196,0.28)" />
                  <XAxis
                    dataKey="date"
                    tick={chartTheme.tickStyle}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getMonth() + 1}/${date.getDate()}`
                    }}
                  />
                  <YAxis yAxisId="left" tick={chartTheme.tickStyle} domain={['auto', 'auto']} />
                  {useDualYAxis && (
                    <YAxis yAxisId="right" orientation="right" tick={chartTheme.tickStyle} domain={['auto', 'auto']} />
                  )}
                  <Tooltip
                    contentStyle={chartTheme.tooltipContentStyle}
                    labelStyle={chartTheme.tooltipLabelStyle}
                    itemStyle={chartTheme.tooltipItemStyle}
                    labelFormatter={(label) => {
                      const date = new Date(label)
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                    }}
                    formatter={(value: any, name: string) => {
                      const metric = ALL_METRICS.find((m) => m.key === name)
                      return [`${value} ${metric?.unit || ''}`, metric?.name || name]
                    }}
                  />
                  {selectedMetrics.length >= 2 && (
                    <Legend
                      formatter={(value: string) => getMetricName(value)}
                      wrapperStyle={{ fontSize: '13px' }}
                    />
                  )}
                  {selectedMetrics.map((metricKey, index) => {
                    const metric = ALL_METRICS.find((m) => m.key === metricKey)
                    if (!metric) return null
                    return (
                      <Line
                        key={metricKey}
                        type="monotone"
                        dataKey={metricKey}
                        name={metricKey}
                        yAxisId={useDualYAxis && index === 1 ? 'right' : 'left'}
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
