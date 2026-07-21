import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, AlertCircle, Info, Pill, TrendingUp, ShieldAlert } from 'lucide-react'
import BackButton from '../components/ui/BackButton'
import { useAuthStore } from '../stores/authStore'
import { healthRecordApi, medicationApi, userApi } from '../services/api'
import { generateInsightReport, type InsightReport, type HealthInsight } from '../services/insights/engine'
import { getAppDateString, getAppDateWindow } from '../utils/appDate'
import toast from 'react-hot-toast'

const ICONS: Record<HealthInsight['severity'], typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

const COLORS: Record<HealthInsight['severity'], string> = {
  info: 'text-primary bg-primary/10',
  warning: 'text-warning bg-yellow-100 dark:bg-yellow-950/30',
  critical: 'text-danger bg-red-100 dark:bg-red-950/30',
}

export default function HealthInsightsPage() {
  const { user } = useAuthStore()
  const [report, setReport] = useState<InsightReport | null>(null)
  const [loading, setLoading] = useState(true)

  const userType = user?.userType ?? null

  const fetchData = async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getAppDateWindow(30)

      const [recordsRes, logsRes, profileRes] = await Promise.all([
        healthRecordApi.getList({ startDate, endDate }),
        medicationApi.getLogs({ startDate, endDate }),
        userApi.getProfile(),
      ])

      const records = recordsRes.data?.list ?? []
      const logs = logsRes.data?.list ?? []
      const profile = profileRes.data ?? profileRes

      const nextReport = generateInsightReport(
        {
          userType: profile?.userType ?? userType,
          hasTransplant: profile?.hasTransplant,
          transplantDate: profile?.transplantDate,
          baselineCreatinine: profile?.baselineCreatinine,
          tacrolimusTargetMin: profile?.tacrolimusTargetMin,
          tacrolimusTargetMax: profile?.tacrolimusTargetMax,
          records,
          medicationLogs: logs.map((l: any) => ({
            medicationId: l.medicationId ?? l.id ?? 'unknown',
            name: l.medication?.name ?? l.name ?? '未知药物',
            date: l.scheduledTime ? getAppDateString(new Date(l.scheduledTime)) : endDate,
            status: l.status,
            scheduledTime: l.scheduledTime ?? '08:00',
          })),
        },
        14
      )

      setReport(nextReport)
    } catch (err: any) {
      toast.error('分析数据加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userType])

  const grouped = useMemo(() => {
    if (!report) return null
    return {
      summary: report.insights.filter((i) => i.type === 'summary'),
      transplant: report.insights.filter((i) => i.type === 'transplant'),
      anomalies: report.insights.filter((i) => i.type === 'anomaly'),
      adherence: report.insights.filter((i) => i.type === 'adherence'),
      trends: report.insights.filter((i) => i.type === 'trend'),
    }
  }, [report])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-helper text-gray-text-secondary">正在分析健康数据...</div>
      </div>
    )
  }

  if (!report || !grouped) {
    return (
      <div className="page-shell">
        <div className="page-header-compact">
          <BackButton />
          <div>
            <p className="section-kicker">本地分析</p>
            <h1 className="mt-2 text-page-title text-gray-text-primary">健康洞察</h1>
          </div>
        </div>
        <div className="card py-12 text-center text-helper text-gray-text-secondary">
          暂无足够数据生成分析报告，建议先记录更多健康指标。
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="page-header-compact">
        <BackButton />
        <div>
          <p className="section-kicker">本地分析</p>
          <h1 className="mt-2 text-page-title text-gray-text-primary">健康洞察</h1>
        </div>
      </div>

      <div className="card-alert-warning flex items-start gap-3">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" />
        <span className="text-helper text-gray-text-primary">以下分析仅基于您记录的数据进行统计整理，仅供参考，不能替代医生的专业诊断和治疗建议。</span>
      </div>

      {report.hasCriticalAnomaly && (
        <div className="card-alert-critical flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-danger" />
          <div>
            <div className="text-body font-medium text-gray-text-primary">检测到关键指标异常</div>
            <div className="mt-1 text-helper text-gray-text-secondary">部分指标明显偏离正常参考范围，建议尽快联系主治医生复查。</div>
          </div>
        </div>
      )}

      {grouped.summary.map((insight) => (
        <InsightCard key={insight.title} insight={insight} />
      ))}

      {grouped.transplant.length > 0 && (
        <Section title="移植专项摘要" icon={ShieldAlert}>
          {grouped.transplant.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </Section>
      )}

      {grouped.anomalies.length > 0 && (
        <Section title="指标异常提醒" icon={AlertTriangle}>
          {grouped.anomalies.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </Section>
      )}

      {grouped.adherence.length > 0 && (
        <Section title="用药分析" icon={Pill}>
          {grouped.adherence.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </Section>
      )}

      {grouped.trends.length > 0 && (
        <Section title="指标趋势" icon={TrendingUp}>
          {grouped.trends.map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </Section>
      )}

      {report.insights.length === 1 && (
        <div className="card py-10 text-center text-helper text-gray-text-secondary">
          暂无更多可分析的数据，建议持续记录健康指标以获得更全面的洞察。
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Info; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="section-kicker">分析模块</p>
        <div className="mt-2 flex items-center gap-2 text-card-title text-gray-text-primary">
          <Icon size={18} className="text-primary" />
          {title}
        </div>
      </div>
      {children}
    </section>
  )
}

function InsightCard({ insight }: { insight: HealthInsight }) {
  const Icon = ICONS[insight.severity]
  const colorClass = COLORS[insight.severity]

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 ${colorClass}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-body font-medium text-gray-text-primary">{insight.title}</div>
          <p className="mt-1 text-helper leading-relaxed text-gray-text-secondary">{insight.content}</p>
        </div>
      </div>
      {insight.disclaimer && <p className="mt-3 border-t border-gray-border pt-3 text-helper text-gray-text-helper">{insight.disclaimer}</p>}
    </div>
  )
}
