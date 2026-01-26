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
} from 'recharts'
import type { DiaryEntry } from './ChartTabs'

interface WakeComponentsChartProps {
  entries: DiaryEntry[]
}

interface MetricToggle {
  key: string
  label: string
  color: string
  isOutOfBed: boolean
}

const METRICS: MetricToggle[] = [
  { key: 'sol', label: 'SOL', color: '#f97316', isOutOfBed: false },
  { key: 'sol_out', label: 'SOL (Out)', color: '#fdba74', isOutOfBed: true },
  { key: 'waso', label: 'WASO', color: '#ef4444', isOutOfBed: false },
  { key: 'waso_out', label: 'WASO (Out)', color: '#fca5a5', isOutOfBed: true },
  { key: 'ema', label: 'EMA', color: '#ec4899', isOutOfBed: false },
  { key: 'ema_out', label: 'EMA (Out)', color: '#f9a8d4', isOutOfBed: true },
]

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function WakeComponentsChart({ entries }: WakeComponentsChartProps) {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(['sol', 'waso', 'ema'])
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

  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: entry.date,
        sol: entry.sol,
        sol_out: entry.sol_out_of_bed,
        waso: entry.waso,
        waso_out: entry.waso_out_of_bed,
        ema: entry.ema,
        ema_out: entry.ema_out_of_bed,
      }))
  }, [entries])

  const yMax = useMemo(() => {
    let max = 0
    chartData.forEach(d => {
      METRICS.forEach(m => {
        if (visibleMetrics.has(m.key)) {
          const val = d[m.key as keyof typeof d]
          if (typeof val === 'number' && val > max) max = val
        }
      })
    })
    return Math.max(60, Math.ceil(max / 30) * 30 + 30)
  }, [chartData, visibleMetrics])

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">No wake component data to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">Wake Components Over Time</h3>
      </div>

      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map(metric => (
          <button
            key={metric.key}
            onClick={() => toggleMetric(metric.key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
              visibleMetrics.has(metric.key)
                ? 'text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            style={{
              backgroundColor: visibleMetrics.has(metric.key) ? metric.color : undefined,
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${visibleMetrics.has(metric.key) ? 'bg-white' : ''}`}
              style={{ backgroundColor: !visibleMetrics.has(metric.key) ? metric.color : undefined }}
            />
            {metric.label}
          </button>
        ))}
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(value) => `${value}m`}
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null
                return (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">{label}</p>
                    {payload.map((item, idx) => {
                      const metric = METRICS.find(m => m.key === item.dataKey)
                      if (!metric) return null
                      return (
                        <p key={idx} className="text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600 dark:text-slate-400">{metric.label}:</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatDuration(item.value as number)}</span>
                        </p>
                      )
                    })}
                  </div>
                )
              }}
            />
            {METRICS.map(metric => {
              if (!visibleMetrics.has(metric.key)) return null
              return (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={metric.isOutOfBed ? 1.5 : 2.5}
                  strokeDasharray={metric.isOutOfBed ? '5 5' : undefined}
                  dot={{ fill: metric.color, strokeWidth: 0, r: metric.isOutOfBed ? 3 : 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  connectNulls
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p><strong>SOL</strong> = Sleep Onset Latency (time to fall asleep), <strong>WASO</strong> = Wake After Sleep Onset (time awake during night)</p>
        <p><strong>EMA</strong> = Early Morning Awakening (woke earlier than wanted). <strong>(Out)</strong> = Time spent out of bed during that period.</p>
      </div>
    </div>
  )
}
