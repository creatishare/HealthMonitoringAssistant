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
    <div className="space-y-4">
      <h1 className="text-page-title font-semibold text-gray-text-primary">个人中心</h1>

      {/* 用户信息卡片 */}
      <div className="card bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-card-title font-medium">用户</h2>
            <p className="text-small text-white/80 mt-1">完善个人档案，获取更精准的健康建议</p>
          </div>
        </div>
      </div>

      {/* 功能菜单 */}
      <div className="card p-0 overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
              index !== menuItems.length - 1 ? 'border-b border-gray-border' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className="text-gray-secondary" />
              <span className="text-body text-gray-text-primary">{item.label}</span>
            </div>
            <ChevronRight size={20} className="text-gray-secondary" />
          </button>
        ))}
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="card w-full flex items-center justify-center gap-2 text-danger hover:bg-red-50 transition-colors"
      >
        <LogOut size={20} />
        <span className="text-body">退出登录</span>
      </button>

      {/* 版本信息 */}
      <p className="text-center text-small text-gray-helper">健康监测助手 v1.0.0</p>
    </div>
  )
}
