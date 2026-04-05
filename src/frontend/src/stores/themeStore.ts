import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      isDark: false,
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme, isDark: newTheme === 'dark' })
        applyTheme(newTheme)
      },
      setTheme: (theme) => {
        set({ theme, isDark: theme === 'dark' })
        applyTheme(theme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

// 应用主题到 DOM
function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// 初始化主题（在应用启动时调用）
export function initTheme() {
  const stored = localStorage.getItem('theme-storage')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.theme) {
        applyTheme(state.theme)
      }
    } catch {
      // 忽略解析错误
    }
  }
}
