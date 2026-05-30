export const APP_TIME_ZONE = 'Asia/Shanghai'
export const APP_TIME_ZONE_OFFSET = '+08:00'

export function getAppDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

export function getAppDateTime(date: string, hours: number, minutes: number) {
  const hourText = hours.toString().padStart(2, '0')
  const minuteText = minutes.toString().padStart(2, '0')
  return new Date(`${date}T${hourText}:${minuteText}:00.000${APP_TIME_ZONE_OFFSET}`)
}

export function addAppDays(date: string, days: number) {
  const value = getAppDateTime(date, 0, 0)
  value.setUTCDate(value.getUTCDate() + days)
  return getAppDateString(value)
}

export function getAppDateWindow(daysBack: number, endDate = getAppDateString()) {
  return {
    startDate: addAppDays(endDate, -daysBack),
    endDate,
  }
}

export function getMillisecondsUntilNextAppDay() {
  const now = new Date()
  const nextDate = addAppDays(getAppDateString(now), 1)
  return getAppDateTime(nextDate, 0, 0).getTime() + 5000 - now.getTime()
}

export function getFallbackScheduledAtForAppDate(scheduledTime: string) {
  const [hours, minutes] = scheduledTime.split(':').map(Number)
  const [year, month, day] = getAppDateString().split('-').map(Number)
  // 兼容未返回 scheduledAt 的旧后端：旧逻辑用 UTC 日期中的同一时刻匹配日志。
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0)).toISOString()
}

export function formatShortAppDate(dateStr: string) {
  const date = dateStr.split('T')[0]
  const [, month, day] = date.split('-')
  return `${month}/${day}`
}

export function formatAppChineseDate(dateStr: string) {
  const [year, month, day] = dateStr.split('T')[0].split('-')
  return `${Number(year)}年${Number(month)}月${Number(day)}日`
}

export function formatAppMonthDayTime(dateStr: string) {
  const date = new Date(dateStr)
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: APP_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const month = parts.find((part) => part.type === 'month')?.value ?? '1'
  const day = parts.find((part) => part.type === 'day')?.value ?? '1'
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '0'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'

  return `${month}月${day}日 ${hour}:${minute}`
}

export function getDaysSinceAppDate(dateStr?: string) {
  if (!dateStr) return null
  const date = dateStr.split('T')[0]
  const start = getAppDateTime(date, 0, 0)
  if (Number.isNaN(start.getTime())) return null

  return Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)))
}
