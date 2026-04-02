import { create } from 'zustand'
import { dashboardApi } from '../services/api'

interface DashboardData {
  user: {
    name?: string
    greeting: string
  }
  today: {
    date: string
    checkIn: {
      weight: { recorded: boolean; value?: number }
      bloodPressure: { recorded: boolean; systolic?: number; diastolic?: number }
      urineVolume: { recorded: boolean; value?: number }
    }
  }
  medications: Array<{
    medicationId: string
    name: string
    dosage: number
    dosageUnit: string
    scheduledTime: string
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
  fetchDashboard: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,

  fetchDashboard: async () => {
    set({ loading: true })
    try {
      const response: any = await dashboardApi.getData()
      set({ data: response.data, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },
}))
