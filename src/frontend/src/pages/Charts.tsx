import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { healthRecordApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { ALL_METRICS, getRecommendedMetrics } from './Dashboard'
import toast from 'react-hot-toast'

const timeRanges = [
  { label: '7天', days: 7 },
  { label: '30天', days: 30 },
  { label: '3个月', days: 90 },
]

const metricRanges: Record<string, { min?: number; max?: number }> = {
  creatinine: { min: 44, max: 133 },
  urea: { min: 2.6, max: 7.5 },
  potassium: { min: 3.5, max: 5.3 },
  uricAcid: { min: 150, max: 420 },
  tacrolimus: { min: 5, max: 15 },
  hemoglobin: { min: 120, max: 160 },
  bloodSugar: { min: 3.9, max: 6.1 },
  bloodPressureSystolic: { min: 90, max: 140 },
  bloodPressureDiastolic: { min: 60, max: 90 },
  sodium: { min: 136, max: 145 },
  phosphorus: { min: 0.87, max: 1.45 },
}

export default function Charts() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [selectedMetric, setSelectedMetric] = useState(ALL_METRICS[0])
  const [selectedRange, setSelectedRange] = useState(timeRanges[0])
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showMoreMetrics, setShowMoreMetrics] = useState(false)

  useEffect(() => {
    fetchTrends()
  }, [selectedMetric, selectedRange])

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const response: any = await healthRecordApi.getTrends({
        metrics: selectedMetric.key,
        startDate,
        endDate,
      })

      setData(response.data?.data || response.data || [])
    } catch (error) {
      toast.error('获取趋势数据失败')
    } finally {
      setLoading(false)
    }
  }

  const range = metricRanges[selectedMetric.key]
  const hasRange = range?.min != null && range?.max != null

  const recommended = getRecommendedMetrics(user?.userType, user?.primaryDisease)
  const visibleMetrics = showMoreMetrics ? ALL_METRICS : ALL_METRICS.filter((m) => recommended.includes(m.key))

  return (
    <div className="page-shell">
      <div className="page-header-compact">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-border bg-white/65 text-gray-text-primary backdrop-blur-xl dark:bg-white/5">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="section-kicker">长期观察</p>
          <h1 className="mt-2 text-page-title text-gray-text-primary">趋势图表</h1>
        </div>
      </div>

      <section className="card">
        <div className="page-header">
          <div>
            <h2 className="text-card-title text-gray-text-primary">选择关注指标</h2>
            <p className="mt-1 text-helper text-gray-text-secondary">先显示与你当前用户类型最相关的指标，其余指标可按需展开。</p>
          </div>
          <button onClick={() => setShowMoreMetrics((v) => !v)} className={`chip ${showMoreMetrics ? 'chip-active' : ''}`}>
            {showMoreMetrics ? '收起全部' : '展开更多'}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleMetrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric)}
              className={`chip ${selectedMetric.key === metric.key ? 'chip-active' : ''}`}
              style={selectedMetric.key === metric.key ? { backgroundColor: metric.color } : undefined}
            >
              {metric.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="page-header">
          <div>
            <h2 className="text-card-title text-gray-text-primary">观察时间</h2>
            <p className="mt-1 text-helper text-gray-text-secondary">切换不同周期，观察波动范围和变化速度。</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {timeRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedRange(range)}
              className={`rounded-[18px] px-3 py-3 text-helper font-medium transition-all ${
                selectedRange.label === range.label
                  ? 'bg-primary text-white shadow-[0_12px_24px_rgba(62,99,221,0.22)]'
                  : 'border border-gray-border bg-white/65 text-gray-text-secondary backdrop-blur-xl dark:bg-white/5'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="page-header">
          <div>
            <p className="section-kicker">图表</p>
            <h2 className="mt-2 flex items-center gap-2 text-card-title text-gray-text-primary">
              <TrendingUp size={18} className="text-primary" />
              {selectedMetric.name}趋势
            </h2>
            <p className="mt-1 text-helper text-gray-text-secondary">当前单位：{selectedMetric.unit}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-gray-text-secondary">
            <TrendingUp size={42} className="mb-3 opacity-25" />
            <p className="text-body">暂无数据</p>
            <p className="mt-1 text-small">录入更多健康记录后再回来查看。</p>
          </div>
        ) : (
          <div className="mt-4 h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(145,161,196,0.28)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#8A94AB' }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#8A94AB' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.96)',
                    border: '1px solid rgba(145,161,196,0.24)',
                    borderRadius: '16px',
                  }}
                  formatter={(value: any) => [`${value} ${selectedMetric.unit}`, selectedMetric.name]}
                />
                {hasRange && (
                  <>
                    <ReferenceLine y={range.max} stroke="#D9485F" strokeDasharray="4 4" label={{ value: '上限', fill: '#D9485F', fontSize: 12 }} />
                    <ReferenceLine y={range.min} stroke="#2F9E6D" strokeDasharray="4 4" label={{ value: '下限', fill: '#2F9E6D', fontSize: 12 }} />
                  </>
                )}
                <Line
                  type="monotone"
                  dataKey={selectedMetric.key}
                  stroke={selectedMetric.color}
                  strokeWidth={2.5}
                  dot={{ fill: selectedMetric.color, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {hasRange && (
        <section className="card">
          <div>
            <p className="section-kicker">参考值</p>
            <h3 className="mt-2 text-card-title text-gray-text-primary">参考范围</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="metric-panel border border-success/20 bg-emerald-50/80 dark:bg-emerald-950/20">
              <p className="text-small font-medium text-success">正常范围</p>
              <p className="mt-2 text-body text-gray-text-primary">{range.min} - {range.max} {selectedMetric.unit}</p>
            </div>
            <div className="metric-panel border border-danger/20 bg-red-50/80 dark:bg-red-950/20">
              <p className="text-small font-medium text-danger">超出范围</p>
              <p className="mt-2 text-body text-gray-text-primary">高于上限或低于下限时，请结合医生建议判断。</p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
