import { useNavigate } from 'react-router-dom'
import { User, FileText, Bell, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export default function Profile() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const menuItems = [
    { icon: User, label: '个人档案', path: '/profile/edit' },
    { icon: FileText, label: '健康记录', path: '/records' },
    { icon: Bell, label: '预警设置', path: '/alerts' },
    { icon: Settings, label: '系统设置', path: '/settings' },
  ]

  const handleLogout = () => {
    logout()
    toast.success('已退出登录')
    navigate('/login')
  }

  return (
    <div className="page-shell">
      <div>
        <p className="section-kicker">账户</p>
        <h1 className="mt-2 text-page-title text-gray-text-primary">个人中心</h1>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary/12 via-white/75 to-emerald-50/70 p-6 dark:from-primary/20 dark:via-white/5 dark:to-emerald-950/20">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary text-white shadow-[0_14px_28px_rgba(62,99,221,0.24)]">
              <User size={30} />
            </div>
            <div>
              <h2 className="text-card-title text-gray-text-primary">用户</h2>
              <p className="mt-1 text-helper text-gray-text-secondary">完善个人档案，获得更贴近自身情况的提醒和展示。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-2">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex w-full items-center justify-between rounded-[20px] p-3 text-left transition-colors hover:bg-white/70 dark:hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon size={18} />
              </span>
              <span className="text-body font-medium text-gray-text-primary">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-text-helper" />
          </button>
        ))}
      </section>

      <button onClick={handleLogout} className="card flex w-full items-center justify-center gap-2 text-danger transition-colors hover:bg-red-50/80 dark:hover:bg-red-950/20">
        <LogOut size={20} />
        <span className="text-body font-medium">退出登录</span>
      </button>

      <p className="text-center text-small text-gray-text-helper">健康监测助手 v1.0.0</p>
    </div>
  )
}
