'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts'
import type { DiaryEntry } from './ChartTabs'

interface BedTimesChartProps {
  entries: DiaryEntry[]
}

// Convert time string "HH:MM:SS" to minutes from midnight
function timeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null
  const date = new Date(timeStr)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  // Adjust for evening times (treat times after 6pm as before midnight, times before 6pm as after midnight)
  if (hours >= 18) {
    return (hours - 24) * 60 + minutes // Negative minutes before midnight
  }
  return hours * 60 + minutes
}

// Format minutes to readable time
function formatTime(minutes: number): string {
  let h = Math.floor(minutes / 60)
  const m = Math.abs(minutes % 60)

  // Handle negative (evening) times
  if (h < 0) {
    h = 24 + h
  }

  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function BedTimesChart({ entries }: BedTimesChartProps) {
  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => {
        const ttbMinutes = timeToMinutes(entry.ttb ?? null)
        const tobMinutes = timeToMinutes(entry.tob ?? null)

        return {
          date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: entry.date,
          ttb: ttbMinutes,
          tob: tobMinutes,
          // For area chart - we need the range
          range: ttbMinutes !== null && tobMinutes !== null ? [ttbMinutes, tobMinutes] : null,
        }
      })
  }, [entries])

  const { yMin, yMax } = useMemo(() => {
    let min = 0
    let max = 0
    chartData.forEach(d => {
      if (d.ttb !== null && d.ttb < min) min = d.ttb
      if (d.tob !== null && d.tob > max) max = d.tob
    })
    // Round to nearest hour with buffer
    return {
      yMin: Math.floor(min / 60) * 60 - 60,
      yMax: Math.ceil(max / 60) * 60 + 60,
    }
  }, [chartData])

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No bed time data to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-medium text-slate-900">Bed Times Over Time</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
            <span className="text-slate-600">Bed Time</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Out of Bed</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
            <defs>
              <linearGradient id="bedTimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1}/>
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
              domain={[yMin, yMax]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={formatTime}
              label={{ value: 'Time', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null
                const ttb = payload.find(p => p.dataKey === 'ttb')?.value as number | undefined
                const tob = payload.find(p => p.dataKey === 'tob')?.value as number | undefined
                return (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-slate-900 mb-2">{label}</p>
                    {ttb !== undefined && (
                      <p className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-indigo-500" />
                        <span className="text-slate-600">Bed Time:</span>
                        <span className="font-medium">{formatTime(ttb)}</span>
                      </p>
                    )}
                    {tob !== undefined && (
                      <p className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-slate-600">Out of Bed:</span>
                        <span className="font-medium">{formatTime(tob)}</span>
                      </p>
                    )}
                  </div>
                )
              }}
            />
            {/* Area between bed time and wake time */}
            <Area
              type="monotone"
              dataKey="tob"
              stroke="none"
              fill="url(#bedTimeGradient)"
              connectNulls
            />
            {/* Bed time line */}
            <Line
              type="monotone"
              dataKey="ttb"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              connectNulls
            />
            {/* Out of bed time line */}
            <Line
              type="monotone"
              dataKey="tob"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-500">
        <p>The shaded area represents your time in bed. Consistent bed times help regulate your sleep.</p>
      </div>
    </div>
  )
}
