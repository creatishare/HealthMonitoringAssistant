import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, Clock, Pill, Smartphone } from 'lucide-react'
import { useNotificationStore } from '../stores/notificationStore'

export default function ReminderSettings() {
  const navigate = useNavigate()
  const { enabled, browserPermission, toggle, init } = useNotificationStore()

  useEffect(() => {
    init()
  }, [init])

  const reminderItems = [
    {
      icon: Bell,
      title: '消息通知',
      description: browserPermission === 'denied' ? '浏览器已禁止通知，请到系统设置中开启' : '开启后可接收本机用药提醒',
      action: 'toggle' as const,
    },
    {
      icon: Pill,
      title: '用药提醒',
      description: '管理药品、剂量、每日提醒时间',
      action: 'link' as const,
      onClick: () => navigate('/medications'),
    },
    {
      icon: Clock,
      title: '提醒提前量',
      description: '在每个用药计划中单独设置提前提醒分钟数',
      action: 'link' as const,
      onClick: () => navigate('/medications/new'),
    },
    {
      icon: Smartphone,
      title: '通知方式',
      description: '当前支持站内提醒和浏览器通知，短信提醒需生产环境配置',
      action: 'static' as const,
    },
  ]

  return (
    <div className="page-shell">
      <div className="page-header-compact">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-border bg-white/65 text-gray-text-primary backdrop-blur-xl dark:bg-white/5">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="section-kicker">提醒</p>
          <h1 className="mt-2 text-page-title text-gray-text-primary">提醒设置</h1>
        </div>
      </div>

      <section className="card p-2">
        {reminderItems.map((item) => (
          <div key={item.title} className="flex w-full items-center justify-between gap-3 rounded-[20px] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
                <item.icon size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold text-gray-text-primary">{item.title}</p>
                <p className="mt-0.5 text-helper text-gray-text-secondary">{item.description}</p>
              </div>
            </div>
            {item.action === 'toggle' && (
              <button
                onClick={toggle}
                className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${enabled ? 'bg-primary' : 'bg-gray-disabled/60'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            )}
            {item.action === 'link' && (
              <button onClick={item.onClick} className="chip shrink-0">
                管理
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="card-alert-info">
        <p className="text-body font-semibold text-gray-text-primary">提醒说明</p>
        <p className="mt-2 text-helper text-gray-text-secondary">
          用药提醒时间来自每个药品的提醒计划。修改药品提醒后，首页和今日用药会按新的时间展示。
        </p>
      </section>
    </div>
  )
}
