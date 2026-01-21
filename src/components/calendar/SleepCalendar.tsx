'use client'

import { useState, useMemo } from 'react'

interface DiaryEntry {
  id: string
  date: string
  tst: number | null
  tib: number | null
  se: number | null
  quality_rating: number | null
}

interface SleepCalendarProps {
  entries: DiaryEntry[]
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '--'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${m > 0 ? ` ${m}m` : ''}`
}

function getSEColor(se: number | null): string {
  if (se === null) return 'bg-slate-100'
  if (se >= 85) return 'bg-green-100'
  if (se >= 70) return 'bg-amber-100'
  return 'bg-red-100'
}

function getSETextColor(se: number | null): string {
  if (se === null) return 'text-slate-400'
  if (se >= 85) return 'text-green-700'
  if (se >= 70) return 'text-amber-700'
  return 'text-red-700'
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function SleepCalendar({ entries }: SleepCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)

  // Create a map of entries by date for quick lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry>()
    entries.forEach(entry => {
      map.set(entry.date, entry)
    })
    return map
  }, [entries])

  // Get calendar data for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Start from Sunday before the first day
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    // End on Saturday after the last day
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    const days: { date: Date; isCurrentMonth: boolean; entry: DiaryEntry | null }[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        entry: entriesByDate.get(dateStr) || null
      })
      current.setDate(current.getDate() + 1)
    }

    return days
  }, [currentDate, entriesByDate])

  const goToPrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
    setSelectedEntry(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
    setSelectedEntry(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedEntry(null)
  }

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-slate-900 min-w-[180px] text-center">{monthYear}</h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAYS.map(day => (
            <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-slate-600">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const isToday = day.date.toDateString() === new Date().toDateString()
            const isSelected = selectedEntry?.date === day.date.toISOString().split('T')[0]

            return (
              <button
                key={idx}
                onClick={() => day.entry && setSelectedEntry(isSelected ? null : day.entry)}
                disabled={!day.entry}
                className={`
                  min-h-[80px] p-2 border-b border-r border-slate-100 text-left transition
                  ${!day.isCurrentMonth ? 'bg-slate-50/50' : ''}
                  ${day.entry ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${!day.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                  ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}
                `}>
                  {day.date.getDate()}
                </div>

                {day.entry && (
                  <div className={`rounded-md p-1 ${getSEColor(day.entry.se)}`}>
                    <div className={`text-xs font-semibold ${getSETextColor(day.entry.se)}`}>
                      {day.entry.se !== null ? `${Math.round(day.entry.se)}%` : '--'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDuration(day.entry.tst)}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Entry Details */}
      {selectedEntry && (
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900">
              {new Date(selectedEntry.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </h4>
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Sleep Efficiency</p>
              <p className={`text-lg font-bold ${getSETextColor(selectedEntry.se)}`}>
                {selectedEntry.se !== null ? `${Math.round(selectedEntry.se)}%` : '--'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Total Sleep</p>
              <p className="text-lg font-bold text-slate-900">
                {formatDuration(selectedEntry.tst)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Time in Bed</p>
              <p className="text-lg font-bold text-slate-900">
                {formatDuration(selectedEntry.tib)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Quality</p>
              <p className="text-lg font-bold text-slate-900">
                {selectedEntry.quality_rating !== null ? `${selectedEntry.quality_rating}/5` : '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100" />
          <span className="text-slate-600">SE ≥ 85%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100" />
          <span className="text-slate-600">SE 70-84%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-100" />
          <span className="text-slate-600">SE &lt; 70%</span>
        </div>
      </div>
    </div>
  )
}
