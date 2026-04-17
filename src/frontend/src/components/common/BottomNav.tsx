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
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-card shadow-nav dark:shadow-none dark:border-t dark:border-gray-border safe-bottom z-50">
      <div className="max-w-mobile mx-auto flex justify-around items-center h-16">
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
  )
}
