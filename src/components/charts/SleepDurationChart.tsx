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

interface SleepDurationChartProps {
  entries: DiaryEntry[]
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function SleepDurationChart({ entries }: SleepDurationChartProps) {
  const [showTST, setShowTST] = useState(true)
  const [showTIB, setShowTIB] = useState(true)

  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: entry.date,
        tst: entry.tst,
        tib: entry.tib,
      }))
  }, [entries])

  const yMax = useMemo(() => {
    let max = 0
    chartData.forEach(d => {
      if (showTST && d.tst && d.tst > max) max = d.tst
      if (showTIB && d.tib && d.tib > max) max = d.tib
    })
    return Math.ceil(max / 60) * 60 + 60
  }, [chartData, showTST, showTIB])

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">No sleep duration data to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">Sleep Duration Over Time</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTST(!showTST)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              showTST ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showTST ? 'bg-white' : 'bg-green-500'}`} />
            TST
          </button>
          <button
            onClick={() => setShowTIB(!showTIB)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              showTIB ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showTIB ? 'bg-white' : 'bg-blue-500'}`} />
            TIB
          </button>
        </div>
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
              tickFormatter={(value) => `${Math.floor(value / 60)}h`}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null
                return (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">{label}</p>
                    {payload.map((item, idx) => (
                      <p key={idx} className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 dark:text-slate-400">{item.dataKey === 'tst' ? 'Total Sleep:' : 'Time in Bed:'}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{formatDuration(item.value as number)}</span>
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            {showTST && (
              <Line
                type="monotone"
                dataKey="tst"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                connectNulls
              />
            )}
            {showTIB && (
              <Line
                type="monotone"
                dataKey="tib"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p><strong>TST</strong> = Total Sleep Time (actual time asleep), <strong>TIB</strong> = Time in Bed (from bedtime to out of bed)</p>
      </div>
    </div>
  )
}
