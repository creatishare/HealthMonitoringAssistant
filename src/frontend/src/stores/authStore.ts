import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../services/api'

export type UserType = 'kidney_failure' | 'kidney_transplant' | 'other'
export type PrimaryDisease =
  | 'diabetic_nephropathy'
  | 'hypertensive_nephropathy'
  | 'chronic_glomerulonephritis'
  | 'other'

interface User {
  id: string
  phone: string
  name?: string
  userType?: UserType | null
  primaryDisease?: PrimaryDisease | null
  onboardingCompleted: boolean
}

interface AuthResponse {
  userId: string
  phone: string
  accessToken: string
  refreshToken: string
  userType?: UserType | null
  onboardingCompleted?: boolean
}

interface ProfileBasicInfo {
  name?: string
  gender?: 'male' | 'female'
  birthDate?: string
  height?: number
  currentWeight?: number
  diagnosisDate?: string
  transplantDate?: string
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
  completeOnboarding: (userType: UserType, primaryDisease: PrimaryDisease, profile?: ProfileBasicInfo) => Promise<void>
}

function buildUser(response: AuthResponse): User {
  return {
    id: response.userId,
    phone: response.phone,
    userType: response.userType ?? null,
    onboardingCompleted: response.onboardingCompleted ?? false,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (phone: string, password: string) => {
        const apiResponse = await authApi.login(phone, password) as any
        const response: AuthResponse = apiResponse.data ?? apiResponse
        const { accessToken, refreshToken } = response

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        set({
          user: buildUser(response),
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      },

      register: async (phone: string, password: string, verificationCode: string) => {
        const apiResponse = await authApi.register(phone, password, verificationCode) as any
        const response: AuthResponse = apiResponse.data ?? apiResponse
        const { accessToken, refreshToken } = response

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        set({
          user: buildUser(response),
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
        set({ accessToken, refreshToken, isAuthenticated: true })
      },

      completeOnboarding: async (userType: UserType, primaryDisease: PrimaryDisease, profile?: ProfileBasicInfo) => {
        await authApi.completeOnboarding(userType, primaryDisease, profile)
        const currentUser = get().user

        if (!currentUser) {
          return
        }

        set({
          user: {
            ...currentUser,
            name: profile?.name ?? currentUser.name,
            userType,
            primaryDisease,
            onboardingCompleted: true,
          },
        })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
