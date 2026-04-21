import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Moon, Bell, Shield, Info, LucideIcon } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { useNotificationStore } from '../stores/notificationStore'

interface SettingItem {
  icon: LucideIcon
  label: string
  type: 'toggle' | 'link'
  value?: boolean
  onToggle?: () => Promise<void> | void
  onClick?: () => void
}

export default function Settings() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useThemeStore()
  const { enabled: notificationEnabled, toggle: toggleNotification, init: initNotification } = useNotificationStore()

  useEffect(() => {
    initNotification()
  }, [initNotification])

  const settingItems: SettingItem[] = [
    { icon: Moon, label: '深色模式', type: 'toggle', value: isDark, onToggle: toggleTheme },
    { icon: Bell, label: '消息通知', type: 'toggle', value: notificationEnabled, onToggle: toggleNotification },
    { icon: Shield, label: '隐私政策', type: 'link', onClick: () => navigate('/privacy-policy') },
    { icon: Info, label: '关于我们', type: 'link', onClick: () => alert('健康监测助手 v1.2.0\n\n为肾衰竭患者提供便捷的健康管理服务') },
  ]

  return (
    <div className="page-shell">
      <div className="page-header-compact">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-border bg-white/65 text-gray-text-primary backdrop-blur-xl dark:bg-white/5">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="section-kicker">偏好</p>
          <h1 className="mt-2 text-page-title text-gray-text-primary">系统设置</h1>
        </div>
      </div>

      <section className="card p-2">
        {settingItems.map((item) => (
          <div key={item.label} className="flex w-full items-center justify-between rounded-[20px] p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon size={18} />
              </span>
              <span className="text-body font-medium text-gray-text-primary">{item.label}</span>
            </div>
            {item.type === 'toggle' ? (
              <button
                onClick={item.onToggle || (() => {})}
                className={`h-7 w-12 rounded-full p-0.5 transition-colors ${item.value ? 'bg-primary' : 'bg-gray-disabled/60'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            ) : (
              <button onClick={item.onClick} className="chip">
                查看
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="card p-2">
        <button
          onClick={() => {
            localStorage.clear()
            window.location.reload()
          }}
          className="flex w-full items-center justify-between rounded-[20px] p-3 text-danger transition-colors hover:bg-red-50/80 dark:hover:bg-red-950/20"
        >
          <span className="text-body font-medium">清除缓存并退出</span>
        </button>
      </section>

      <p className="text-center text-small text-gray-text-helper">健康监测助手 v1.0.0</p>
    </div>
  )
}
