'use client'

import { useState, useEffect } from 'react'

interface DurationInputProps {
  value: number | undefined
  onChange: (minutes: number) => void
  label?: string
  error?: string
  minValue?: number
}

const HOURS = [0, 1, 2, 3, 4, 5, 6]
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

export function DurationInput({ value, onChange, label, error, minValue = 0 }: DurationInputProps) {
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)

  const labelId = 'duration-label'
  const errorId = 'duration-error'
  const hoursLabelId = 'hours-label'
  const minutesLabelId = 'minutes-label'

  // Parse initial value and trigger onChange with default
  useEffect(() => {
    if (value !== undefined) {
      setHours(Math.floor(value / 60))
      setMinutes(value % 60)
    } else {
      // Trigger onChange with default value (0) so form knows a value is set
      onChange(0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleHourSelect = (h: number) => {
    setHours(h)
    const totalMinutes = h * 60 + minutes
    onChange(totalMinutes)
  }

  const handleMinuteSelect = (m: number) => {
    setMinutes(m)
    const totalMinutes = hours * 60 + m
    onChange(totalMinutes)
  }

  const totalMinutes = hours * 60 + minutes

  return (
    <div className="space-y-4">
      {label && (
        <label id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}

      {/* Hours Selection */}
      <div>
        <p id={hoursLabelId} className="text-sm text-slate-600 dark:text-slate-400 mb-2">Hours</p>
        <div 
          role="radiogroup" 
          aria-labelledby={hoursLabelId}
          className="grid grid-cols-4 gap-2"
        >
          {HOURS.map((h) => {
            const isSelected = hours === h
            return (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${h} hours`}
                onClick={() => handleHourSelect(h)}
                className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-ring ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {h}h
              </button>
            )
          })}
        </div>
      </div>

      {/* Minutes Selection */}
      <div>
        <p id={minutesLabelId} className="text-sm text-slate-600 dark:text-slate-400 mb-2">Minutes</p>
        <div 
          role="radiogroup" 
          aria-labelledby={minutesLabelId}
          className="grid grid-cols-4 gap-2"
        >
          {MINUTES.map((m) => {
            const isSelected = minutes === m
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${m} minutes`}
                onClick={() => handleMinuteSelect(m)}
                className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors min-h-[44px] focus-ring ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m}m
              </button>
            )
          })}
        </div>
      </div>

      {/* Display total duration */}
      <div className="text-center py-4 bg-slate-50 dark:bg-slate-800 rounded-lg" aria-live="polite">
        <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {hours > 0 ? `${hours}h ` : ''}{minutes}m
        </span>
        <span className="text-slate-600 dark:text-slate-400 text-sm ml-2">
          ({totalMinutes} minutes total)
        </span>
      </div>

      {minValue > 0 && totalMinutes > 0 && totalMinutes < minValue && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Minimum recommended: {minValue} minutes
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
