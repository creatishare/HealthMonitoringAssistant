import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Clock, MoreVertical, Pencil, Pill, Plus, Trash2 } from 'lucide-react'
import { medicationApi } from '../services/api'
import toast from 'react-hot-toast'

interface Medication {
  id: string
  name: string
  specification?: string
  dosage: number
  dosageUnit: string
  frequency: string
  reminderTimes: string[]
  status: string
}

interface TodayMedication {
  medicationId: string
  name: string
  dosage: number
  dosageUnit: string
  scheduledTime: string
  scheduledAt?: string
  status: 'pending' | 'taken' | 'missed' | 'skipped'
  logId?: string
}

const frequencyText: Record<string, string> = {
  once_daily: '每日一次',
  twice_daily: '每日两次',
  three_daily: '每日三次',
  every_other_day: '隔日一次',
  weekly: '每周一次',
}

const categoryText = [
  { keywords: ['环孢素', '他克莫司', '雷帕', '西罗莫司', '吗替麦考酚', '麦考酚', '泼尼松', '甲泼尼龙'], label: '免疫抑制剂' },
  { keywords: ['碳酸氢钠', '钙', '铁', '叶酸', '骨化三醇', '维生素'], label: '辅助用药' },
  { keywords: ['降压', '洛尔', '地平', '沙坦', '普利'], label: '血压管理' },
  { keywords: ['胰岛素', '二甲双胍', '阿卡波糖'], label: '血糖管理' },
]

const medToneClasses = [
  'border-l-primary',
  'border-l-success',
  'border-l-warning',
  'border-l-danger',
  'border-l-medication',
]

function getLocalScheduledAt(scheduledTime: string) {
  const [hours, minutes] = scheduledTime.split(':').map(Number)
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0).toISOString()
}

function getTimeLabel(time: string) {
  const hour = Number(time.split(':')[0])
  if (hour < 11) return '早晨'
  if (hour < 14) return '中午'
  if (hour < 18) return '下午'
  return '晚间'
}

function getMedicationCategory(name: string) {
  return categoryText.find((category) => category.keywords.some((keyword) => name.includes(keyword)))?.label || '常规用药'
}

function groupTodayMedications(todayMeds: TodayMedication[]) {
  const groups = new Map<string, TodayMedication[]>()

  todayMeds
    .slice()
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
    .forEach((med) => {
      const list = groups.get(med.scheduledTime) || []
      list.push(med)
      groups.set(med.scheduledTime, list)
    })

  return Array.from(groups.entries()).map(([time, meds]) => ({ time, meds }))
}

export default function Medications() {
  const navigate = useNavigate()
  const [medications, setMedications] = useState<Medication[]>([])
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [loading, setLoading] = useState(false)
  const [todayLoading, setTodayLoading] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  useEffect(() => {
    fetchMedications()
    fetchTodayMedications()
  }, [])

  const todayGroups = useMemo(() => groupTodayMedications(todayMeds), [todayMeds])
  const takenCount = todayMeds.filter((med) => med.status === 'taken').length
  const activeCount = medications.filter((med) => med.status === 'active').length

  const fetchMedications = async () => {
    setLoading(true)
    try {
      const response: any = await medicationApi.getList()
      setMedications(response.data.list)
    } catch (error) {
      toast.error('获取用药列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayMedications = async () => {
    setTodayLoading(true)
    try {
      const response: any = await medicationApi.getToday()
      setTodayMeds(response.data.medications)
    } catch (error) {
      console.error('获取今日用药失败', error)
    } finally {
      setTodayLoading(false)
    }
  }

  const handleMarkTaken = async (med: TodayMedication) => {
    try {
      await medicationApi.recordLog({
        medicationId: med.medicationId,
        scheduledTime: med.scheduledAt || getLocalScheduledAt(med.scheduledTime),
        status: 'taken',
        actualTime: new Date().toISOString(),
      })
      toast.success(`已记录 ${med.name} ${med.scheduledTime} 服用`)
      fetchTodayMedications()
    } catch (error) {
      toast.error('标记失败，请重试')
    }
  }

  const handlePause = async (id: string) => {
    try {
      await medicationApi.pause(id)
      toast.success('已暂停提醒')
      fetchMedications()
      fetchTodayMedications()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handleResume = async (id: string) => {
    try {
      await medicationApi.resume(id)
      toast.success('已恢复提醒')
      fetchMedications()
      fetchTodayMedications()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  const handleToggleStatus = (med: Medication) => {
    if (med.status === 'active') {
      handlePause(med.id)
      return
    }

    handleResume(med.id)
  }

  const handleDelete = async (id: string) => {
    setActionMenuId(null)

    if (!window.confirm('确定要删除该用药提醒吗？此操作不可恢复。')) {
      return
    }

    try {
      await medicationApi.delete(id)
      toast.success('已删除用药提醒')
      fetchMedications()
      fetchTodayMedications()
    } catch (error) {
      toast.error('删除失败，请重试')
    }
  }

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-title text-gray-text-primary">用药管理</h1>
        <p className="mt-2 text-helper text-gray-text-secondary">设置您的用药提醒</p>
      </div>

      <section className="card p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            <h2 className="text-card-title text-gray-text-primary">今日用药计划</h2>
          </div>
          <p className="text-helper text-gray-text-secondary">{takenCount}/{todayMeds.length} 已服用</p>
        </div>

        {todayLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : todayGroups.length === 0 ? (
          <div className="py-10 text-center">
            <Pill size={42} className="mx-auto text-gray-disabled" />
            <p className="mt-3 text-helper text-gray-text-secondary">今日暂无用药安排</p>
          </div>
        ) : (
          <div className="relative mt-6 space-y-6 pl-7">
            <div className="absolute bottom-2 left-[10px] top-2 w-px bg-gray-border" />
            {todayGroups.map((group) => {
              const groupTaken = group.meds.every((med) => med.status === 'taken')

              return (
                <div key={group.time} className="relative">
                  <div className={`absolute -left-[34px] top-0 flex h-6 w-6 items-center justify-center rounded-full border ${groupTaken ? 'border-success bg-success text-white' : 'border-gray-border bg-gray-bg text-gray-text-helper'}`}>
                    {groupTaken ? <Check size={14} /> : null}
                  </div>

                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-body font-semibold text-gray-text-primary">{group.time}</span>
                    <span className="text-helper text-gray-text-secondary">{getTimeLabel(group.time)}</span>
                  </div>

                  <div className="space-y-3">
                    {group.meds.map((med) => {
                      const isTaken = med.status === 'taken'

                      return (
                        <div
                          key={`${med.medicationId}-${med.scheduledTime}`}
                          className={`flex items-center justify-between gap-3 rounded-[18px] px-4 py-3 ${isTaken ? 'bg-success/10' : 'bg-primary/5'}`}
                        >
                          <div className="min-w-0">
                            <p className={`truncate text-body font-semibold ${isTaken ? 'text-success' : 'text-gray-text-primary'}`}>{med.name}</p>
                            <p className="text-helper text-gray-text-secondary">{med.dosage}{med.dosageUnit}</p>
                          </div>
                          {isTaken ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-helper font-medium text-success">
                              <Check size={15} />
                              已服
                            </span>
                          ) : (
                            <button onClick={() => handleMarkTaken(med)} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-button bg-primary px-4 text-helper font-semibold text-white shadow-[0_8px_18px_rgba(0,145,160,0.24)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_10px_22px_rgba(0,145,160,0.3)] active:translate-y-0">
                              <Check size={15} />
                              服用
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <button
        onClick={() => navigate('/medications/new')}
        className="flex min-h-[190px] w-full flex-col items-center justify-center rounded-card border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/10"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Plus size={26} />
        </span>
        <span className="mt-4 text-body font-semibold text-gray-text-primary">添加新药物</span>
        <span className="mt-1 text-helper text-gray-text-secondary">设置用药名称、剂量和提醒时间</span>
      </button>

      <section className="card p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill size={20} className="text-primary" />
            <h2 className="text-card-title text-gray-text-primary">我的药物</h2>
          </div>
          <p className="text-helper text-gray-text-secondary">共 {medications.length} 种</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : medications.length === 0 ? (
          <div className="py-10 text-center">
            <Pill size={46} className="mx-auto text-gray-disabled" />
            <p className="mt-3 text-helper text-gray-text-secondary">暂无用药提醒</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {medications.map((med, index) => {
              const isActive = med.status === 'active'
              const toneClass = medToneClasses[index % medToneClasses.length]

              return (
                <div key={med.id} className={`relative rounded-[22px] border border-gray-border bg-white/54 p-4 shadow-sm transition-colors dark:bg-white/5 ${toneClass} border-l-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => navigate(`/medications/${med.id}/edit`)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-body font-semibold text-gray-text-primary">{med.name}</p>
                      <p className="mt-0.5 text-helper text-gray-text-secondary">{getMedicationCategory(med.name)}</p>
                    </button>
                    <button onClick={() => setActionMenuId(actionMenuId === med.id ? null : med.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-text-secondary transition-colors hover:bg-primary/10 hover:text-primary" aria-label="更多操作">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  {actionMenuId === med.id && (
                    <div className="absolute right-4 top-12 z-10 w-32 rounded-[16px] border border-gray-border bg-gray-card p-1 shadow-card backdrop-blur-xl">
                      <button
                        onClick={() => {
                          setActionMenuId(null)
                          navigate(`/medications/${med.id}/edit`)
                        }}
                        className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-helper text-gray-text-primary transition-colors hover:bg-primary/10"
                      >
                        <Pencil size={15} />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-helper text-danger transition-colors hover:bg-red-50/80 dark:hover:bg-red-950/20"
                      >
                        <Trash2 size={15} />
                        删除
                      </button>
                    </div>
                  )}

                  <p className="mt-3 text-body font-medium text-gray-text-primary">
                    {med.specification || `${med.dosage}${med.dosageUnit}`} · {frequencyText[med.frequency] || med.frequency}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {med.reminderTimes.map((time) => (
                        <span key={time} className="inline-flex items-center gap-1 rounded-full bg-gray-bg px-2.5 py-1 text-small text-gray-text-secondary dark:bg-white/8">
                          <Clock size={13} />
                          {time}
                        </span>
                      ))}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Bell size={18} className={isActive ? 'text-primary' : 'text-gray-text-helper'} />
                      <button
                        onClick={() => handleToggleStatus(med)}
                        className={`h-7 w-12 rounded-full p-0.5 transition-colors ${isActive ? 'bg-primary' : 'bg-gray-disabled/50'}`}
                        aria-label={isActive ? '暂停提醒' : '恢复提醒'}
                      >
                        <span className={`block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {medications.length > 0 && (
          <p className="mt-4 text-center text-small text-gray-text-helper">{activeCount} 种药物正在提醒</p>
        )}
      </section>
    </div>
  )
}
