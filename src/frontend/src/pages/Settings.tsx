import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Moon, Bell, Shield, Info } from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()

  const settingItems = [
    { icon: Moon, label: '深色模式', type: 'toggle', value: false },
    { icon: Bell, label: '消息通知', type: 'toggle', value: true },
    { icon: Shield, label: '隐私政策', type: 'link', path: '/privacy' },
    { icon: Info, label: '关于我们', type: 'link', path: '/about' },
  ]

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} className="text-gray-text-primary" />
        </button>
        <h1 className="text-page-title font-semibold text-gray-text-primary">系统设置</h1>
      </div>

      {/* 设置列表 */}
      <div className="card p-0 overflow-hidden">
        {settingItems.map((item, index) => (
          <div
            key={item.label}
            className={`w-full flex items-center justify-between p-4 ${
              index !== settingItems.length - 1 ? 'border-b border-gray-border' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className="text-gray-secondary" />
              <span className="text-body text-gray-text-primary">{item.label}</span>
            </div>
            {item.type === 'toggle' ? (
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  item.value ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform m-0.5 ${
                    item.value ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
            ) : (
              <button className="text-small text-gray-secondary">查看</button>
            )}
          </div>
        ))}
      </div>

      {/* 缓存清理 */}
      <div className="card p-0 overflow-hidden">
        <button
          onClick={() => {
            localStorage.clear()
            window.location.reload()
          }}
          className="w-full flex items-center justify-between p-4 text-danger hover:bg-red-50 transition-colors"
        >
          <span className="text-body">清除缓存并退出</span>
        </button>
      </div>

      {/* 版本信息 */}
      <p className="text-center text-small text-gray-helper mt-8">
        健康监测助手 v1.0.0
      </p>
    </div>
  )
}
