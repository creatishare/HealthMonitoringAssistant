import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  enabled: boolean
  browserPermission: NotificationPermission | 'unsupported'
  toggle: () => Promise<void>
  init: () => void
  requestPermission: () => Promise<boolean>
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      enabled: false,
      browserPermission: 'default',

      init: () => {
        if (!('Notification' in window)) {
          set({ browserPermission: 'unsupported' })
          return
        }
        set({ browserPermission: Notification.permission })
      },

      requestPermission: async () => {
        if (!('Notification' in window)) {
          return false
        }
        try {
          const permission = await Notification.requestPermission()
          set({ browserPermission: permission })
          return permission === 'granted'
        } catch {
          return false
        }
      },

      toggle: async () => {
        const current = get().enabled

        // 如果要开启通知
        if (!current) {
          // 检查浏览器支持
          if (!('Notification' in window)) {
            alert('您的浏览器不支持消息通知功能')
            return
          }

          // 请求权限
          if (Notification.permission !== 'granted') {
            const granted = await get().requestPermission()
            if (!granted) {
              alert('请允许通知权限以接收用药提醒')
              return
            }
          }

          set({ enabled: true })
          // 发送一条测试通知
          new Notification('健康监测助手', {
            body: '消息通知已开启，您将收到用药提醒',
            icon: '/icon.png',
          })
        } else {
          set({ enabled: false })
        }
      },
    }),
    {
      name: 'notification-settings',
    }
  )
)

// 发送通知的辅助函数
export function sendNotification(title: string, options?: NotificationOptions) {
  const { enabled } = useNotificationStore.getState()

  if (!enabled) return false
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  try {
    new Notification(title, {
      icon: '/icon.png',
      ...options,
    })
    return true
  } catch {
    return false
  }
}
