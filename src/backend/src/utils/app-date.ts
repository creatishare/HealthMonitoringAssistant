export const APP_TIME_ZONE = 'Asia/Shanghai';
export const APP_TIME_ZONE_OFFSET = '+08:00';

export function getAppDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function getAppHour(date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour')?.value;

  return Number(hour ?? 0);
}

export function getAppTimeString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';

  return `${hour}:${minute}`;
}

export function getAppDateTime(date: string, hours: number, minutes: number): Date {
  const hourText = hours.toString().padStart(2, '0');
  const minuteText = minutes.toString().padStart(2, '0');
  return new Date(`${date}T${hourText}:${minuteText}:00.000${APP_TIME_ZONE_OFFSET}`);
}

export function getDateOnlyValue(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date | string): string;
export function formatDateOnly(date?: Date | string | null): string | undefined;
export function formatDateOnly(date?: Date | string | null): string | undefined {
  if (!date) {
    return undefined;
  }

  if (typeof date === 'string') {
    return date.split('T')[0];
  }

  return date.toISOString().split('T')[0];
}

export function addAppDays(date: string, days: number): string {
  const value = getAppDateTime(date, 0, 0);
  value.setUTCDate(value.getUTCDate() + days);
  return getAppDateString(value);
}

export function getAppDateRange(date = getAppDateString()) {
  const tomorrow = addAppDays(date, 1);

  return {
    date,
    start: getAppDateTime(date, 0, 0),
    end: getAppDateTime(tomorrow, 0, 0),
  };
}

export function getDateOnlyRange(date = getAppDateString()) {
  const tomorrow = addAppDays(date, 1);

  return {
    date,
    start: getDateOnlyValue(date),
    end: getDateOnlyValue(tomorrow),
  };
}

export function getAppDateWindow(daysBack: number, endDate = getAppDateString()) {
  return {
    startDate: addAppDays(endDate, -daysBack),
    endDate,
  };
}

export function formatAppDisplayDate(date = new Date()): string {
  return date.toLocaleDateString('zh-CN', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
