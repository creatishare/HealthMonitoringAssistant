import { NavLink } from 'react-router-dom'
import { Home, FileText, Pill, User, HeartPulse } from 'lucide-react'

export default function BottomNav() {
  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/records', label: '记录', icon: FileText },
    { path: '/medications', label: '用药', icon: Pill },
    { path: '/profile', label: '我的', icon: User },
  ]

  return (
    <>
      <nav className="safe-bottom fixed bottom-3 left-3 right-3 z-50 rounded-[28px] border border-white/70 bg-gray-card/95 px-2 py-2 shadow-nav backdrop-blur-2xl md:hidden dark:border-white/10">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span className="mt-1 text-[11px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <nav className="fixed left-0 top-0 bottom-0 z-40 hidden w-[240px] flex-col border-r border-white/50 bg-gray-card/80 px-5 py-6 backdrop-blur-2xl md:flex dark:border-white/8">
        <div className="rounded-[28px] border border-primary/10 bg-white/65 p-5 backdrop-blur-xl dark:bg-white/5">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <HeartPulse size={24} />
          </div>
          <h1 className="text-xl font-semibold text-gray-text-primary">肾健康助手</h1>
          <p className="mt-2 text-helper text-gray-text-secondary">日常记录、用药提醒与趋势追踪集中在一个更清晰的工作台。</p>
        </div>

        <div className="mt-6 space-y-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[22px] px-4 py-3 text-body font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/85 text-primary shadow-[0_14px_28px_rgba(62,99,221,0.14)] dark:bg-white/10'
                    : 'text-gray-text-secondary hover:bg-white/55 hover:text-gray-text-primary dark:hover:bg-white/5'
                }`
              }
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon size={18} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
