'use client'

import { useState } from 'react'
import { ChartTabs, type DiaryEntry, type ISIScore } from './ChartTabs'
import { SleepCalendar } from '../calendar/SleepCalendar'

interface SleepDataVisualizationProps {
  entries: DiaryEntry[]
  isiScores?: ISIScore[]
}

type ViewMode = 'chart' | 'calendar'

export function SleepDataVisualization({ entries, isiScores = [] }: SleepDataVisualizationProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart')

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No data to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('chart')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === 'chart'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Charts
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === 'calendar'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Calendar
        </button>
      </div>

      {/* Content */}
      {viewMode === 'chart' ? (
        <ChartTabs entries={entries} isiScores={isiScores} />
      ) : (
        <SleepCalendar entries={entries} />
      )}
    </div>
  )
}
