import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Download,
  Heart,
  HelpCircle,
  LogOut,
  MessageSquare,
  Pencil,
  Settings,
  Share2,
  Shield,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { reportApi, userApi } from '../services/api'
import toast from 'react-hot-toast'

interface UserProfile {
  phone?: string
  name?: string
  gender?: 'male' | 'female'
  height?: number
  currentWeight?: number
  userType?: 'kidney_failure' | 'kidney_transplant' | 'other'
  dialysisType?: 'none' | 'hemodialysis' | 'peritoneal'
  dryWeight?: number
  baselineCreatinine?: number
  diagnosisDate?: string
  primaryDisease?: string
  hasTransplant?: boolean
  transplantDate?: string
  createdAt?: string
}

type InfoPanel = 'privacy' | 'help' | 'feedback' | null

const primaryDiseaseText: Record<string, string> = {
  diabetic_nephropathy: '糖尿病肾病',
  hypertensive_nephropathy: '高血压肾病',
  chronic_glomerulonephritis: '慢性肾小球肾炎',
  other: '其他',
}

const dialysisTypeText: Record<string, string> = {
  none: '未透析',
  hemodialysis: '血液透析',
  peritoneal: '腹膜透析',
}

function formatDate(date?: string) {
  if (!date) return '未填写'
  return date.split('T')[0]
}

function getDaysSince(date?: string) {
  if (!date) return null
  const start = new Date(date)
  if (Number.isNaN(start.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function getReportDateRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 30)

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function Profile() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [activePanel, setActivePanel] = useState<InfoPanel>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response: any = await userApi.getProfile()
      setProfile(response.data ?? response)
    } catch (error) {
      toast.error('获取个人档案失败')
    } finally {
      setLoading(false)
    }
  }

  const displayName = profile?.name || user?.name || '用户'
  const avatarText = displayName.slice(0, 1)
  const trackDate = profile?.transplantDate || profile?.diagnosisDate || profile?.createdAt
  const trackedDays = getDaysSince(trackDate)
  const userTypeLabel = profile?.hasTransplant || profile?.userType === 'kidney_transplant' ? '肾移植术后' : profile?.userType === 'kidney_failure' ? '肾衰竭管理' : '健康监测'

  const profileItems = useMemo(
    () => [
      { label: '身高', value: profile?.height ? `${profile.height} cm` : '未填写' },
      { label: '当前体重', value: profile?.currentWeight ? `${profile.currentWeight} kg` : '未填写' },
      { label: '原发病', value: profile?.primaryDisease ? primaryDiseaseText[profile.primaryDisease] : '未填写' },
      { label: '透析史', value: profile?.dialysisType ? dialysisTypeText[profile.dialysisType] : '未填写' },
      { label: '移植时间', value: profile?.hasTransplant ? formatDate(profile.transplantDate) : '未移植' },
      { label: '干体重', value: profile?.dryWeight ? `${profile.dryWeight} kg` : '未填写' },
    ],
    [profile]
  )

  const handleLogout = () => {
    logout()
    toast.success('已退出登录')
    navigate('/login')
  }

  const buildReport = async () => {
    const range = getReportDateRange()
    const blob = await reportApi.downloadFollowUp({ ...range, t: Date.now() }) as unknown as Blob
    return {
      blob,
      filename: `健康报告-${range.startDate}-${range.endDate}.pdf`,
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const report = await buildReport()
      downloadBlob(report.blob, report.filename)
      toast.success('报告已生成')
    } catch (error) {
      toast.error('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  const handleShare = async () => {
    setExporting(true)
    try {
      const report = await buildReport()
      const file = new File([report.blob], report.filename, { type: 'application/pdf' })
      const canShareFile =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })

      if (canShareFile) {
        await navigator.share({
          title: '健康监测报告',
          text: '这是一份近 30 天健康监测复诊报告。',
          files: [file],
        })
        toast.success('已打开分享')
      } else {
        downloadBlob(report.blob, report.filename)
        toast.success('当前设备不支持直接分享，已为你下载报告')
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        toast.error('分享失败，请稍后重试')
      }
    } finally {
      setExporting(false)
    }
  }

  const actions = [
    { icon: Download, title: '数据导出', description: '导出健康记录报告', tone: 'text-primary bg-primary/10', onClick: handleExport },
    { icon: Bell, title: '提醒设置', description: '自定义提醒时间和方式', tone: 'text-success bg-success/10', onClick: () => navigate('/reminder-settings') },
    { icon: Share2, title: '分享给医生', description: '生成健康报告分享', tone: 'text-warning bg-warning/10', onClick: handleShare },
    { icon: Shield, title: '隐私与安全', description: '数据保护和账号安全', tone: 'text-danger bg-danger/10', onClick: () => navigate('/privacy-security') },
    { icon: HelpCircle, title: '帮助中心', description: '使用指南和常见问题', tone: 'text-medication bg-medication/10', onClick: () => navigate('/help-center') },
    { icon: MessageSquare, title: '意见反馈', description: '帮助我们做得更好', tone: 'text-primary bg-primary/10', onClick: () => setActivePanel(activePanel === 'feedback' ? null : 'feedback') },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-title text-gray-text-primary">我的</h1>
      </div>

      <section className="card p-5 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-page-title text-primary">
              {avatarText}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-page-title text-gray-text-primary">{displayName}</h2>
              <p className="mt-1 text-helper text-gray-text-secondary">
                {trackedDays != null ? `已记录 ${trackedDays} 天` : '开始记录你的健康变化'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-success/10 px-3 py-1 text-small font-medium text-success">{userTypeLabel}</span>
                <span className="text-helper text-gray-text-secondary">{formatDate(trackDate)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="系统设置"
          >
            <Settings size={21} />
          </button>
        </div>
      </section>

      <section className="card p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart size={20} className="text-primary" />
            <h2 className="text-card-title text-gray-text-primary">健康档案</h2>
          </div>
          <button onClick={() => navigate('/profile/edit')} className="chip">
            <Pencil size={15} />
            编辑
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {profileItems.map((item) => (
            <div key={item.label} className="rounded-[18px] bg-white/54 p-4 dark:bg-white/5">
              <p className="text-helper text-gray-text-secondary">{item.label}</p>
              <p className="mt-1 break-words text-body font-semibold text-gray-text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-2">
        {actions.map((item) => (
          <button
            key={item.title}
            onClick={item.onClick}
            disabled={exporting && (item.title === '数据导出' || item.title === '分享给医生')}
            className="flex w-full items-center justify-between rounded-[20px] px-3 py-4 text-left transition-colors hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
                <item.icon size={21} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body font-semibold text-gray-text-primary">{item.title}</span>
                <span className="block truncate text-helper text-gray-text-secondary">{item.description}</span>
              </span>
            </div>
            <ChevronRight size={18} className="shrink-0 text-gray-text-helper" />
          </button>
        ))}
      </section>

      {activePanel && (
        <section className="card">
          {activePanel === 'privacy' && (
            <InfoPanel
              icon={Shield}
              title="隐私与安全"
              lines={['查看隐私政策、管理账号安全，并确认健康数据仅用于你的健康记录与报告整理。']}
              actionLabel="查看隐私政策"
              onAction={() => navigate('/privacy-policy')}
            />
          )}
          {activePanel === 'help' && (
            <InfoPanel
              icon={HelpCircle}
              title="帮助中心"
              lines={['常用入口：录入健康记录、添加用药提醒、查看趋势图表、生成复诊报告。']}
              actionLabel="查看使用记录"
              onAction={() => navigate('/records')}
            />
          )}
          {activePanel === 'feedback' && (
            <InfoPanel
              icon={MessageSquare}
              title="意见反馈"
              lines={['可以通过邮件提交问题、截图和建议，我们会优先处理影响记录、提醒、报告导出的反馈。']}
              actionLabel="发送反馈邮件"
              onAction={() => {
                window.location.href = 'mailto:feedback@healthmonitor.example.com?subject=健康监测助手反馈'
              }}
            />
          )}
        </section>
      )}

      <button onClick={handleLogout} className="card flex w-full items-center justify-center gap-2 text-danger transition-colors hover:bg-red-50/80 dark:hover:bg-red-950/20">
        <LogOut size={20} />
        <span className="text-body font-medium">退出登录</span>
      </button>

      <p className="text-center text-small text-gray-text-helper">健康监测助手 v1.0.0</p>
    </div>
  )
}

function InfoPanel({
  icon: Icon,
  title,
  lines,
  actionLabel,
  onAction,
}: {
  icon: typeof Shield
  title: string
  lines: string[]
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-body font-semibold text-gray-text-primary">{title}</h3>
        {lines.map((line) => (
          <p key={line} className="mt-1 text-helper text-gray-text-secondary">{line}</p>
        ))}
        <button onClick={onAction} className="mt-3 inline-flex items-center gap-1 text-helper font-medium text-primary">
          {actionLabel}
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
