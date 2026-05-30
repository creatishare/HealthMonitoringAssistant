import { describe, expect, it } from 'vitest'
import { getAlertActions, type AlertActionSource } from './alertActions'

const baseAlert: AlertActionSource = {
  id: 'alert-1',
  level: 'warning',
  type: 'metric',
  message: '指标提醒',
  isRead: false,
}

describe('alert action helpers', () => {
  it('builds record, report, and read actions for an unread critical metric alert', () => {
    const actions = getAlertActions({
      ...baseAlert,
      level: 'critical',
      recordId: 'record-1',
      metric: 'potassium',
    })

    expect(actions.map((action) => action.kind)).toEqual(['record', 'report', 'read'])
    expect(actions[0]).toMatchObject({
      kind: 'record',
      label: '查看记录',
      to: '/records/record-1',
    })
  })

  it('builds medication and read actions for medication alerts', () => {
    const actions = getAlertActions({
      ...baseAlert,
      type: 'medication',
      medicationId: 'med-1',
      medicationLogId: 'log-1',
    })

    expect(actions.map((action) => action.kind)).toEqual(['medication', 'read'])
    expect(actions[0]).toMatchObject({
      kind: 'medication',
      label: '查看用药',
      to: '/medications/med-1/edit',
    })
  })

  it('omits read action for already read alerts', () => {
    const actions = getAlertActions({
      ...baseAlert,
      isRead: true,
      recordId: 'record-1',
    })

    expect(actions.map((action) => action.kind)).toEqual(['record'])
  })

  it('keeps report action for critical alerts without direct relation', () => {
    const actions = getAlertActions({
      ...baseAlert,
      level: 'critical',
      type: 'system',
    })

    expect(actions.map((action) => action.kind)).toEqual(['report', 'read'])
  })
})
