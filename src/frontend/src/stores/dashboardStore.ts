import { create } from 'zustand'
import { dashboardApi } from '../services/api'

export type UserType = 'kidney_failure' | 'kidney_transplant' | 'other'
export type PrimaryDisease = 'diabetic_nephropathy' | 'hypertensive_nephropathy' | 'chronic_glomerulonephritis' | 'other'

interface DashboardData {
  user: {
    name?: string
    greeting: string
    userType?: UserType | null
    primaryDisease?: PrimaryDisease | null
  }
  today: {
    date: string
    checkIn: {
      weight: { recorded: boolean; value?: number; status?: 'normal' | 'warning' | 'critical' }
      bloodPressure: { recorded: boolean; systolic?: number; diastolic?: number; status?: 'normal' | 'warning' | 'critical' }
      urineVolume: { recorded: boolean; value?: number; status?: 'normal' | 'warning' | 'critical' }
    }
  }
  medications: Array<{
    medicationId: string
    name: string
    dosage: number
    dosageUnit: string
    scheduledTime: string
    scheduledAt?: string
    status: string
    logId?: string
  }>
  alerts: Array<{
    id: string
    level: string
    message: string
  }>
  recentMetrics: Array<{
    key: string
    name: string
    value: number
    unit: string
    date: string
  }>
}

interface DashboardState {
  data: DashboardData | null
  loading: boolean
  fetchDashboard: (config?: any) => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,

  fetchDashboard: async (config?: any) => {
    set({ loading: true })
    try {
      const response: any = await dashboardApi.getData(config)
      set({ data: response.data, loading: false })
    } catch (error: any) {
      set({ loading: false })
      if (error.name === 'CanceledError' || error.name === 'AbortError') return
      throw error
    }
  },
}))
