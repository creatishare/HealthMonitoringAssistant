export type AlertLevel = 'critical' | 'warning' | 'info'
export type AlertType = 'metric' | 'medication' | 'system' | string

export interface AlertActionSource {
  id: string
  level: AlertLevel
  type?: AlertType | null
  message: string
  isRead?: boolean
  recordId?: string | null
  metric?: string | null
  medicationId?: string | null
  medicationLogId?: string | null
}

export type AlertAction =
  | { kind: 'record'; label: string; to: string }
  | { kind: 'medication'; label: string; to: string }
  | { kind: 'report'; label: string }
  | { kind: 'read'; label: string }

export function getAlertActions(alert: AlertActionSource): AlertAction[] {
  const actions: AlertAction[] = []

  if (alert.recordId) {
    actions.push({
      kind: 'record',
      label: '查看记录',
      to: `/records/${alert.recordId}`,
    })
  }

  if (alert.type === 'medication' || alert.medicationId) {
    actions.push({
      kind: 'medication',
      label: '查看用药',
      to: alert.medicationId ? `/medications/${alert.medicationId}/edit` : '/medications',
    })
  }

  if (alert.level === 'critical') {
    actions.push({
      kind: 'report',
      label: '生成报告',
    })
  }

  if (!alert.isRead) {
    actions.push({
      kind: 'read',
      label: '标为已读',
    })
  }

  return actions
}
