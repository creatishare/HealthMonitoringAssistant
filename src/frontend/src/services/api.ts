import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，清除本地存储并跳转登录
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 认证相关API
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
}

// 用户相关API
export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
}

// 健康记录相关API
export const healthRecordApi = {
  getList: (params?: any) => api.get('/health-records', { params }),
  getById: (id: string) => api.get(`/health-records/${id}`),
  create: (data: any) => api.post('/health-records', data),
  update: (id: string, data: any) => api.put(`/health-records/${id}`, data),
  delete: (id: string) => api.delete(`/health-records/${id}`),
  getTrends: (params: any) => api.get('/health-records/trends', { params }),
}

// 血药浓度相关API
export const drugConcentrationApi = {
  getList: (params?: any) => api.get('/drug-concentrations', { params }),
  create: (data: any) => api.post('/drug-concentrations', data),
  getTrends: (params: any) => api.get('/drug-concentrations/trends', { params }),
}

// 用药管理相关API
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

// 预警相关API
export const alertApi = {
  getList: (params?: any) => api.get('/alerts', { params }),
  getUnreadCount: () => api.get('/alerts/unread-count'),
  markAsRead: (id: string) => api.put(`/alerts/${id}/read`),
  markAllAsRead: () => api.put('/alerts/read-all'),
  delete: (id: string) => api.delete(`/alerts/${id}`),
}

// 仪表盘相关API
export const dashboardApi = {
  getData: () => api.get('/dashboard'),
}

// OCR相关API
export const ocrApi = {
  upload: (formData: FormData) => api.post('/ocr/upload', formData),
  recognize: (imageId: string) => api.post('/ocr/recognize', { imageId }),
  confirm: (data: any) => api.post('/ocr/confirm', data),
  getResult: (id: string) => api.get(`/ocr/${id}`),
}

export default api
