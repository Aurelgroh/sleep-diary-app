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
  ReferenceArea,
} from 'recharts'
import type { ISIScore } from './ChartTabs'

interface ISIChartProps {
  scores: ISIScore[]
}

const SEVERITY_BANDS = [
  { min: 0, max: 7, label: 'No Insomnia', color: '#22c55e' },
  { min: 8, max: 14, label: 'Subthreshold', color: '#eab308' },
  { min: 15, max: 21, label: 'Moderate', color: '#f97316' },
  { min: 22, max: 28, label: 'Severe', color: '#ef4444' },
]

function getSeverityLabel(score: number): string {
  const band = SEVERITY_BANDS.find(b => score >= b.min && score <= b.max)
  return band?.label || 'Unknown'
}

function getSeverityColor(score: number): string {
  const band = SEVERITY_BANDS.find(b => score >= b.min && score <= b.max)
  return band?.color || '#64748b'
}

export function ISIChart({ scores }: ISIChartProps) {
  const chartData = useMemo(() => {
    return [...scores]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(score => ({
        date: new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: score.date,
        score: score.score,
        type: score.assessment_type,
      }))
  }, [scores])

  if (scores.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-slate-500 dark:text-slate-400">No ISI scores recorded yet</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">ISI assessments track insomnia severity over time</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">Insomnia Severity Index (ISI) Over Time</h3>
      </div>

      {/* Severity legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {SEVERITY_BANDS.map(band => (
          <div key={band.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: band.color, opacity: 0.3 }} />
            <span className="text-slate-600 dark:text-slate-400">{band.label} ({band.min}-{band.max})</span>
          </div>
        ))}
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {/* Severity band backgrounds */}
            <ReferenceArea y1={0} y2={7} fill="#22c55e" fillOpacity={0.1} />
            <ReferenceArea y1={8} y2={14} fill="#eab308" fillOpacity={0.1} />
            <ReferenceArea y1={15} y2={21} fill="#f97316" fillOpacity={0.1} />
            <ReferenceArea y1={22} y2={28} fill="#ef4444" fillOpacity={0.1} />

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[0, 28]}
              ticks={[0, 7, 14, 21, 28]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{ value: 'ISI Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 } }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null
                const score = payload[0]?.value as number
                const type = (payload[0]?.payload as { type: string })?.type
                return (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">{label}</p>
                    <p className="text-sm capitalize text-slate-500 dark:text-slate-400 mb-2">{type?.replace('_', ' ')}</p>
                    <p className="text-sm flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getSeverityColor(score) }} />
                      <span className="text-slate-600 dark:text-slate-400">Score:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{score}</span>
                      <span className="text-slate-500 dark:text-slate-400">({getSeverityLabel(score)})</span>
                    </p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={({ cx, cy, payload }) => {
                const color = getSeverityColor(payload.score)
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p>The ISI is a 7-item questionnaire measuring insomnia severity (0-28). Lower scores indicate better sleep.</p>
      </div>
    </div>
  )
}
