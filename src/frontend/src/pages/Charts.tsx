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
  const visibleMetrics = showMoreMetrics
    ? ALL_METRICS
    : ALL_METRICS.filter(m => recommended.includes(m.key))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} className="text-gray-text-primary" />
        </button>
        <h1 className="text-page-title font-semibold text-gray-text-primary">趋势图表</h1>
      </div>

      {/* 指标选择 */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          {visibleMetrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric)}
              className={`px-3 py-1.5 rounded-full text-small transition-colors ${
                selectedMetric.key === metric.key
                  ? 'text-white'
                  : 'bg-gray-bg text-gray-secondary border border-gray-border'
              }`}
              style={{
                backgroundColor: selectedMetric.key === metric.key ? metric.color : undefined
              }}
            >
              {metric.name}
            </button>
          ))}
          <button
            onClick={() => setShowMoreMetrics(v => !v)}
            className={`px-3 py-1.5 rounded-full text-small transition-colors ${
              showMoreMetrics
                ? 'text-white bg-primary'
                : 'bg-gray-bg text-gray-secondary border border-gray-border'
            }`}
          >
            {showMoreMetrics ? '收起' : '更多'}
          </button>
        </div>
      </div>

      {/* 时间范围选择 */}
      <div className="card">
        <div className="flex gap-2">
          {timeRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedRange(range)}
              className={`flex-1 py-2 rounded-lg text-small ${
                selectedRange.label === range.label
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-secondary'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-primary" />
          <h2 className="text-card-title font-medium text-gray-text-primary">
            {selectedMetric.name}趋势
          </h2>
          <span className="text-small text-gray-secondary">({selectedMetric.unit})</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-secondary">暂无数据</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [`${value} ${selectedMetric.unit}`, selectedMetric.name]}
                />
                {hasRange && (
                  <>
                    <ReferenceLine
                      y={range.max}
                      stroke="#F5222D"
                      strokeDasharray="3 3"
                      label={{ value: '上限', fill: '#F5222D', fontSize: 12 }}
                    />
                    <ReferenceLine
                      y={range.min}
                      stroke="#52C41A"
                      strokeDasharray="3 3"
                      label={{ value: '下限', fill: '#52C41A', fontSize: 12 }}
                    />
                  </>
                )}
                <Line
                  type="monotone"
                  dataKey={selectedMetric.key}
                  stroke={selectedMetric.color}
                  strokeWidth={2}
                  dot={{ fill: selectedMetric.color, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 参考范围说明 */}
      {hasRange && (
        <div className="card">
          <h3 className="text-body font-medium text-gray-text-primary mb-3">参考范围</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-small text-gray-secondary">
                正常范围: {range.min} - {range.max} {selectedMetric.unit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger"></div>
              <span className="text-small text-gray-secondary">超出正常范围</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
