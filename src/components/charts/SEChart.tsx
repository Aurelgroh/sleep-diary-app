'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts'
import type { DiaryEntry } from './ChartTabs'

interface SEChartProps {
  entries: DiaryEntry[]
}

export function SEChart({ entries }: SEChartProps) {
  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: entry.date,
        se: entry.se !== null ? Math.round(entry.se) : null,
      }))
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">No sleep efficiency data to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">Sleep Efficiency Over Time</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          <span className="text-slate-600 dark:text-slate-400">Sleep Efficiency %</span>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="seGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null
                const se = payload[0]?.value
                return (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">{label}</p>
                    <p className="text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Sleep Efficiency: </span>
                      <span className={`font-bold ${
                        se && Number(se) >= 85 ? 'text-green-600 dark:text-green-400' :
                        se && Number(se) >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                      }`}>{se}%</span>
                    </p>
                  </div>
                )
              }}
            />
            <ReferenceLine
              y={85}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{ value: 'Target 85%', position: 'right', fill: '#22c55e', fontSize: 11 }}
            />
            <ReferenceLine
              y={75}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{ value: '75%', position: 'right', fill: '#f59e0b', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="se"
              fill="url(#seGradient)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="se"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p><strong>Sleep Efficiency (SE%)</strong> = Total Sleep Time / Time in Bed. Target is 85% or higher.</p>
      </div>
    </div>
  )
}
