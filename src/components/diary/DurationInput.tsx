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

  // Parse initial value
  useEffect(() => {
    if (value !== undefined) {
      setHours(Math.floor(value / 60))
      setMinutes(value % 60)
    }
  }, [])

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
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}

      {/* Hours Selection */}
      <div>
        <p className="text-sm text-slate-500 mb-2">Hours</p>
        <div className="grid grid-cols-4 gap-2">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleHourSelect(h)}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                hours === h
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Minutes Selection */}
      <div>
        <p className="text-sm text-slate-500 mb-2">Minutes</p>
        <div className="grid grid-cols-4 gap-2">
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleMinuteSelect(m)}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                minutes === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Display total duration */}
      <div className="text-center py-4 bg-slate-50 rounded-lg">
        <span className="text-2xl font-semibold text-slate-900">
          {hours > 0 ? `${hours}h ` : ''}{minutes}m
        </span>
        <span className="text-slate-500 text-sm ml-2">
          ({totalMinutes} minutes total)
        </span>
      </div>

      {minValue > 0 && totalMinutes > 0 && totalMinutes < minValue && (
        <p className="text-sm text-amber-600">
          Minimum recommended: {minValue} minutes
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
