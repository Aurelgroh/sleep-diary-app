'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts'

interface DiaryEntry {
  id: string
  date: string
  tst: number | null
  tib: number | null
  se: number | null
  sol: number | null
  waso: number | null
  ema: number | null
  twt: number | null
  quality_rating: number | null
}

interface SleepMetricsChartProps {
  entries: DiaryEntry[]
}

interface MetricConfig {
  key: keyof DiaryEntry
  label: string
  color: string
  unit: string
  yAxisId: 'time' | 'percent' | 'quality'
  defaultVisible: boolean
}

const METRICS: MetricConfig[] = [
  { key: 'tst', label: 'Total Sleep (TST)', color: '#22c55e', unit: 'min', yAxisId: 'time', defaultVisible: true },
  { key: 'tib', label: 'Time in Bed (TIB)', color: '#3b82f6', unit: 'min', yAxisId: 'time', defaultVisible: true },
  { key: 'se', label: 'Sleep Efficiency (SE%)', color: '#8b5cf6', unit: '%', yAxisId: 'percent', defaultVisible: true },
  { key: 'sol', label: 'Sleep Onset Latency (SOL)', color: '#f97316', unit: 'min', yAxisId: 'time', defaultVisible: false },
  { key: 'waso', label: 'Wake After Sleep Onset (WASO)', color: '#ef4444', unit: 'min', yAxisId: 'time', defaultVisible: false },
  { key: 'ema', label: 'Early Morning Awakening (EMA)', color: '#ec4899', unit: 'min', yAxisId: 'time', defaultVisible: false },
  { key: 'twt', label: 'Total Wake Time (TWT)', color: '#f59e0b', unit: 'min', yAxisId: 'time', defaultVisible: false },
  { key: 'quality_rating', label: 'Sleep Quality (1-5)', color: '#06b6d4', unit: '', yAxisId: 'quality', defaultVisible: false },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function SleepMetricsChart({ entries }: SleepMetricsChartProps) {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(METRICS.filter(m => m.defaultVisible).map(m => m.key))
  )

  const toggleMetric = (key: string) => {
    setVisibleMetrics(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Prepare chart data - sorted by date ascending
  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: entry.date,
        tst: entry.tst,
        tib: entry.tib,
        se: entry.se !== null ? Math.round(entry.se) : null,
        sol: entry.sol,
        waso: entry.waso,
        ema: entry.ema,
        twt: entry.twt,
        quality_rating: entry.quality_rating,
      }))
  }, [entries])

  // Calculate y-axis domains based on visible metrics
  const { timeMax, showPercentAxis, showQualityAxis } = useMemo(() => {
    const visibleTimeMetrics = METRICS.filter(
      m => visibleMetrics.has(m.key) && m.yAxisId === 'time'
    )

    let maxTime = 0
    chartData.forEach(d => {
      visibleTimeMetrics.forEach(m => {
        const val = d[m.key as keyof typeof d]
        if (typeof val === 'number' && val > maxTime) {
          maxTime = val
        }
      })
    })

    return {
      timeMax: Math.ceil(maxTime / 60) * 60 + 60, // Round up to nearest hour + buffer
      showPercentAxis: visibleMetrics.has('se'),
      showQualityAxis: visibleMetrics.has('quality_rating'),
    }
  }, [chartData, visibleMetrics])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-slate-900 mb-2">{label}</p>
        {payload.map((item, idx) => {
          const metric = METRICS.find(m => m.key === item.dataKey)
          if (!metric || item.value === null) return null

          let displayValue: string
          if (metric.yAxisId === 'time') {
            displayValue = formatDuration(item.value)
          } else if (metric.yAxisId === 'percent') {
            displayValue = `${item.value}%`
          } else {
            displayValue = `${item.value}/5`
          }

          return (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-600">{metric.label}:</span>
              <span className="font-medium text-slate-900">{displayValue}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No data to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map(metric => (
          <button
            key={metric.key}
            onClick={() => toggleMetric(metric.key)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              visibleMetrics.has(metric.key)
                ? 'text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={{
              backgroundColor: visibleMetrics.has(metric.key) ? metric.color : undefined,
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                visibleMetrics.has(metric.key) ? 'bg-white' : ''
              }`}
              style={{
                backgroundColor: !visibleMetrics.has(metric.key) ? metric.color : undefined,
              }}
            />
            {metric.label.split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />

            {/* Time-based Y-axis (minutes) */}
            <YAxis
              yAxisId="time"
              orientation="left"
              domain={[0, timeMax]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(value) => `${Math.floor(value / 60)}h`}
              label={{ value: 'Duration', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
            />

            {/* Percentage Y-axis */}
            {showPercentAxis && (
              <YAxis
                yAxisId="percent"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'SE%', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
              />
            )}

            {/* Quality Y-axis */}
            {showQualityAxis && !showPercentAxis && (
              <YAxis
                yAxisId="quality"
                orientation="right"
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{ value: 'Quality', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
              />
            )}

            {/* 85% SE reference line when SE is visible */}
            {showPercentAxis && (
              <ReferenceLine
                yAxisId="percent"
                y={85}
                stroke="#22c55e"
                strokeDasharray="5 5"
                label={{ value: '85% target', position: 'right', fill: '#22c55e', fontSize: 11 }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Render lines for visible metrics */}
            {METRICS.map(metric => {
              if (!visibleMetrics.has(metric.key)) return null

              // Handle quality axis when percent is also visible
              let yAxisId = metric.yAxisId
              if (metric.yAxisId === 'quality' && showPercentAxis) {
                // Quality uses percent axis when both are visible (scaled differently in data)
                return null // Skip quality when SE is showing to avoid confusion
              }

              return (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  yAxisId={yAxisId}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={{ fill: metric.color, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  connectNulls
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend explanation */}
      <div className="text-xs text-slate-500 space-y-1">
        <p><strong>TST</strong> = Total Sleep Time, <strong>TIB</strong> = Time in Bed, <strong>SE%</strong> = Sleep Efficiency</p>
        <p><strong>SOL</strong> = Sleep Onset Latency, <strong>WASO</strong> = Wake After Sleep Onset, <strong>EMA</strong> = Early Morning Awakening, <strong>TWT</strong> = Total Wake Time</p>
      </div>
    </div>
  )
}
