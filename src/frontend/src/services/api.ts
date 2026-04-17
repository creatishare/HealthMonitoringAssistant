import axios from 'axios'
import type { UserType } from '../stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.dispatchEvent(new CustomEvent('unauthorized'))
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }),
  register: (phone: string, password: string, verificationCode: string) =>
    api.post('/auth/register', { phone, password, verificationCode }),
  logout: () => api.post('/auth/logout'),
  sendVerificationCode: (phone: string, type: string = 'register') =>
    api.post('/auth/verification-code', { phone, type }),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', {}, { headers: { Authorization: `Bearer ${refreshToken}` } }),
  resetPassword: (phone: string, verificationCode: string, newPassword: string) =>
    api.post('/auth/reset-password', { phone, verificationCode, newPassword }),
  completeOnboarding: (userType: UserType) =>
    api.patch('/users/onboarding', { userType }),
}

export const healthRecordApi = {
  getList: (params?: any) => api.get('/health-records', { params }),
  getById: (id: string) => api.get(`/health-records/${id}`),
  create: (data: any) => api.post('/health-records', data),
  update: (id: string, data: any) => api.put(`/health-records/${id}`, data),
  delete: (id: string) => api.delete(`/health-records/${id}`),
  getTrends: (params: any, config?: any) => api.get('/health-records/trends', { params, ...config }),
}

export const medicationApi = {
  getList: (params?: any) => api.get('/medications', { params }),
  create: (data: any) => api.post('/medications', data),
  update: (id: string, data: any) => api.put(`/medications/${id}`, data),
  delete: (id: string) => api.delete(`/medications/${id}`),
  pause: (id: string) => api.post(`/medications/${id}/pause`),
  resume: (id: string) => api.post(`/medications/${id}/resume`),
  getToday: () => api.get('/medications/today'),
  getLogs: (params?: any) => api.get('/medications/logs', { params }),
  recordLog: (data: any) => api.post('/medications/logs', data),
  getStatistics: (params: any) => api.get('/medications/statistics', { params }),
}

export const alertApi = {
  getList: (params?: any) => api.get('/alerts', { params }),
  getUnreadCount: () => api.get('/alerts/unread-count'),
  markAsRead: (id: string) => api.put(`/alerts/${id}/read`),
  markAllAsRead: () => api.put('/alerts/read-all'),
  delete: (id: string) => api.delete(`/alerts/${id}`),
}

export const dashboardApi = {
  getData: (config?: any) => api.get('/dashboard', config),
}

export const ocrApi = {
  upload: (formData: FormData) => api.post('/ocr/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  recognize: (imageId: string) => api.post('/ocr/recognize', { imageId }),
  confirm: (data: any) => api.post('/ocr/confirm', data),
  getResult: (id: string) => api.get(`/ocr/${id}`),
}
