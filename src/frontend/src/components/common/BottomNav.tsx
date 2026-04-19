import { NavLink } from 'react-router-dom'
import { Home, FileText, Pill, User } from 'lucide-react'

export default function BottomNav() {
  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/records', label: '记录', icon: FileText },
    { path: '/medications', label: '用药', icon: Pill },
    { path: '/profile', label: '我的', icon: User },
  ]

  return (
    <>
      {/* 手机端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-card shadow-nav dark:shadow-none dark:border-t dark:border-gray-border safe-bottom z-50 md:hidden">
        <div className="w-full flex justify-around items-center h-16">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={24} />
              <span className="text-xs mt-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 桌面端左侧边栏 */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-[200px] bg-gray-card border-r border-gray-border flex-col z-50">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold text-primary">肾健康助手</h1>
        </div>
        <div className="flex-1 px-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-text-secondary hover:bg-gray-bg hover:text-gray-text-primary'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
