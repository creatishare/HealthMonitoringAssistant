import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, AlertCircle, Info, Pill, TrendingUp, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { healthRecordApi, medicationApi } from '../services/api'
import { generateInsightReport, type InsightReport, type HealthInsight } from '../services/insights/engine'
import toast from 'react-hot-toast'

const ICONS: Record<HealthInsight['severity'], typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

const COLORS: Record<HealthInsight['severity'], string> = {
  info: 'text-primary bg-blue-50 dark:bg-blue-900/20',
  warning: 'text-warning bg-yellow-50 dark:bg-yellow-900/20',
  critical: 'text-danger bg-red-50 dark:bg-red-900/20',
}

export default function HealthInsightsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [report, setReport] = useState<InsightReport | null>(null)
  const [loading, setLoading] = useState(true)

  const userType = user?.userType ?? null

  const fetchData = async () => {
    setLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const [recordsRes, logsRes] = await Promise.all([
        healthRecordApi.getList({ startDate, endDate }),
        medicationApi.getLogs({ startDate, endDate }),
      ])

      const records = recordsRes.data?.list ?? []
      const logs = logsRes.data?.list ?? []

      // 构造 checkIns（从 dashboard 数据中提取最近 30 天的打卡记录）
      const checkIns: Array<{ date: string; weight?: number; systolic?: number; diastolic?: number }> = []

      const report = generateInsightReport(
        {
          userType,
          records,
          checkIns,
          medicationLogs: logs.map((l: any) => ({
            medicationId: l.medicationId ?? l.id ?? 'unknown',
            name: l.medication?.name ?? l.name ?? '未知药物',
            date: l.scheduledTime ? l.scheduledTime.split('T')[0] : endDate,
            status: l.status,
            scheduledTime: l.scheduledTime ?? '08:00',
          })),
        },
        14
      )

      setReport(report)
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
      anomalies: report.insights.filter((i) => i.type === 'anomaly'),
      adherence: report.insights.filter((i) => i.type === 'adherence'),
      trends: report.insights.filter((i) => i.type === 'trend'),
    }
  }, [report])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-bg flex items-center justify-center">
        <div className="text-gray-text-secondary text-helper">正在分析健康数据...</div>
      </div>
    )
  }

  if (!report || !grouped) {
    return (
      <div className="min-h-screen bg-gray-bg">
        <header className="sticky top-0 z-40 bg-gray-card/80 backdrop-blur-md border-b border-gray-border">
          <div className="w-full mx-auto px-4 h-14 flex items-center gap-3">
            <button aria-label="back" onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft size={20} className="text-gray-text-primary" />
            </button>
            <h1 className="text-page-title text-gray-text-primary">健康洞察</h1>
          </div>
        </header>
        <div className="w-full mx-auto p-6 text-center text-gray-text-secondary text-helper">
          暂无足够数据生成分析报告，建议先记录更多健康指标。
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-bg pb-8">
      <header className="sticky top-0 z-40 bg-gray-card/80 backdrop-blur-md border-b border-gray-border">
        <div className="w-full mx-auto px-4 h-14 flex items-center gap-3">
          <button aria-label="back" onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={20} className="text-gray-text-primary" />
          </button>
          <h1 className="text-page-title text-gray-text-primary">健康洞察</h1>
        </div>
      </header>

      <div className="w-full mx-auto px-4 py-4 space-y-4">
        {/* 顶部免责声明 */}
        <div className="flex items-start gap-2 rounded-card bg-yellow-50 dark:bg-yellow-900/20 p-3 text-small text-warning">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <span>
            以下分析仅基于您记录的数据进行统计整理，仅供参考，不能替代医生的专业诊断和治疗建议。
          </span>
        </div>

        {/* 关键异常警告 */}
        {report.hasCriticalAnomaly && (
          <div className="rounded-card bg-red-50 dark:bg-red-900/20 p-4 text-danger flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-body">检测到关键指标异常</div>
              <div className="text-helper mt-1">
                部分指标明显偏离正常参考范围，建议尽快联系主治医生复查。
              </div>
            </div>
          </div>
        )}

        {/* 摘要 */}
        {grouped.summary.map((insight) => (
          <InsightCard key={insight.title} insight={insight} />
        ))}

        {/* 异常指标 */}
        {grouped.anomalies.length > 0 && (
          <Section title="指标异常提醒" icon={AlertTriangle}>
            {grouped.anomalies.map((insight) => (
              <InsightCard key={insight.title} insight={insight} />
            ))}
          </Section>
        )}

        {/* 用药依从性 */}
        {grouped.adherence.length > 0 && (
          <Section title="用药分析" icon={Pill}>
            {grouped.adherence.map((insight) => (
              <InsightCard key={insight.title} insight={insight} />
            ))}
          </Section>
        )}

        {/* 趋势分析 */}
        {grouped.trends.length > 0 && (
          <Section title="指标趋势" icon={TrendingUp}>
            {grouped.trends.map((insight) => (
              <InsightCard key={insight.title} insight={insight} />
            ))}
          </Section>
        )}

        {report.insights.length === 1 && (
          <div className="text-center text-gray-text-secondary text-helper py-8">
            暂无更多可分析的数据，建议持续记录健康指标以获得更全面的洞察。
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Info; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-gray-text-primary font-medium text-body">
        <Icon size={18} className="text-primary" />
        {title}
      </div>
      {children}
    </div>
  )
}

function InsightCard({ insight }: { insight: HealthInsight }) {
  const Icon = ICONS[insight.severity]
  const colorClass = COLORS[insight.severity]

  return (
    <div className="bg-gray-card rounded-card p-4 space-y-2">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-body text-gray-text-primary">{insight.title}</div>
          <p className="text-helper text-gray-text-secondary mt-1 leading-relaxed">{insight.content}</p>
        </div>
      </div>
      {insight.disclaimer && (
        <p className="text-small text-gray-text-helper border-t border-gray-border pt-2">
          {insight.disclaimer}
        </p>
      )}
    </div>
  )
}
