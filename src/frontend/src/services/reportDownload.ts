import { reportApi } from './api'
import { getAppDateWindow } from '../utils/appDate'

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function getApiErrorMessage(error: any, fallback: string) {
  const status = error?.response?.status
  const data = error?.response?.data

  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text)
      if (parsed?.message) return parsed.message
    } catch {
      // Keep the fallback below if the blob is not JSON.
    }
  }

  if (data?.message) return data.message
  if (status === 401) return '登录已过期，请重新登录'
  if (status === 404) return '报告接口不存在，请确认后端已部署最新版本'
  if (status === 500) return '报告生成失败，请查看后端日志'
  if (!error?.response) return '无法连接服务器，请检查后端服务'

  return fallback
}

export async function downloadFollowUpReport() {
  const range = getAppDateWindow(30)
  const blob = await reportApi.downloadFollowUp({ ...range, t: Date.now() }) as unknown as Blob
  const filename = `健康报告-${range.startDate}-${range.endDate}.pdf`
  downloadBlob(blob, filename)
  return filename
}
