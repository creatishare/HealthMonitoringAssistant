import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/api'

interface User {
  id: string
  phone: string
  name?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, verificationCode: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (phone: string, password: string) => {
        const response: any = await authApi.login(phone, password)
        const { userId, accessToken, refreshToken } = response.data || response

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        set({
          user: { id: userId, phone },
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      },

      register: async (phone: string, password: string, verificationCode: string) => {
        const response: any = await authApi.register(phone, password, verificationCode)
        const { userId, accessToken, refreshToken } = response.data || response

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        set({
          user: { id: userId, phone },
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      },

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ accessToken, refreshToken })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
