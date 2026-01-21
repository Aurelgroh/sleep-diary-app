'use client'

import { useState } from 'react'
import { SEChart } from './SEChart'
import { SleepDurationChart } from './SleepDurationChart'
import { WakeComponentsChart } from './WakeComponentsChart'
import { BedTimesChart } from './BedTimesChart'
import { ISIChart } from './ISIChart'

export interface DiaryEntry {
  id: string
  date: string
  ttb?: string | null
  tob?: string | null
  tst: number | null
  tib: number | null
  se: number | null
  sol: number | null
  sol_out_of_bed?: number | null
  waso: number | null
  waso_out_of_bed?: number | null
  ema: number | null
  ema_out_of_bed?: number | null
  twt: number | null
  quality_rating: number | null
}

export interface ISIScore {
  id: string
  date: string
  score: number
  assessment_type: string
}

interface ChartTabsProps {
  entries: DiaryEntry[]
  isiScores?: ISIScore[]
}

const TABS = [
  { id: 'se', label: 'Sleep Efficiency' },
  { id: 'duration', label: 'Sleep Duration' },
  { id: 'wake', label: 'Wake Components' },
  { id: 'bedtimes', label: 'Bed Times' },
  { id: 'isi', label: 'ISI Scores' },
]

export function ChartTabs({ entries, isiScores = [] }: ChartTabsProps) {
  const [activeTab, setActiveTab] = useState('se')

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex overflow-x-auto gap-1 pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart content */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {activeTab === 'se' && <SEChart entries={entries} />}
        {activeTab === 'duration' && <SleepDurationChart entries={entries} />}
        {activeTab === 'wake' && <WakeComponentsChart entries={entries} />}
        {activeTab === 'bedtimes' && <BedTimesChart entries={entries} />}
        {activeTab === 'isi' && <ISIChart scores={isiScores} />}
      </div>
    </div>
  )
}
