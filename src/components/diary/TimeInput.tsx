'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function formatHour12(hour: number): string {
  const h = hour % 12 || 12
  return h.toString()
}

function formatMinute(minute: number): string {
  return minute.toString().padStart(2, '0')
}

function getAmPm(hour: number): string {
  return hour < 12 ? 'AM' : 'PM'
}

interface WheelPickerProps {
  items: { value: number; label: string }[]
  selectedValue: number | null
  onSelect: (value: number) => void
  itemHeight?: number
}

function WheelPicker({ items, selectedValue, onSelect, itemHeight = 44 }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)

  const visibleItems = 5
  const containerHeight = itemHeight * visibleItems
  const paddingItems = Math.floor(visibleItems / 2)

  // Scroll to selected value on mount
  useEffect(() => {
    if (containerRef.current && selectedValue !== null) {
      const index = items.findIndex(item => item.value === selectedValue)
      if (index !== -1) {
        containerRef.current.scrollTop = index * itemHeight
      }
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    setIsScrolling(true)

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current)
    }

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return

      const scrollTop = containerRef.current.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1))

      // Snap to nearest item
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth'
      })

      onSelect(items[clampedIndex].value)
      setIsScrolling(false)
    }, 100)
  }, [items, itemHeight, onSelect])

  const handleItemClick = (index: number) => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({
      top: index * itemHeight,
      behavior: 'smooth'
    })
    onSelect(items[index].value)
  }

  return (
    <div className="relative" style={{ height: containerHeight }}>
      {/* Selection highlight */}
      <div
        className="absolute left-0 right-0 bg-blue-100 rounded-lg pointer-events-none z-0"
        style={{
          top: paddingItems * itemHeight,
          height: itemHeight
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: paddingItems * itemHeight,
          paddingBottom: paddingItems * itemHeight
        }}
      >
        {items.map((item, index) => {
          const isSelected = item.value === selectedValue
          return (
            <div
              key={item.value}
              onClick={() => handleItemClick(index)}
              className={`flex items-center justify-center cursor-pointer snap-center transition-all ${
                isSelected ? 'text-blue-600 font-semibold text-xl' : 'text-slate-400 text-lg'
              }`}
              style={{ height: itemHeight }}
            >
              {item.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TimeInput({ value, onChange, label, error }: TimeInputProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null)

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number)
      setSelectedHour(h)
      setSelectedMinute(m)
    }
  }, [])

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour)
    if (selectedMinute !== null) {
      onChange(`${hour.toString().padStart(2, '0')}:${formatMinute(selectedMinute)}`)
    }
  }

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute)
    if (selectedHour !== null) {
      onChange(`${selectedHour.toString().padStart(2, '0')}:${formatMinute(minute)}`)
    }
  }

  const hourItems = HOURS.map(h => ({
    value: h,
    label: `${formatHour12(h)} ${getAmPm(h)}`
  }))

  const minuteItems = MINUTES.map(m => ({
    value: m,
    label: `:${formatMinute(m)}`
  }))

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}

      {/* Picker wheels container */}
      <div className="flex gap-4 bg-white rounded-2xl border border-slate-200 p-4">
        {/* Hour picker */}
        <div className="flex-1">
          <p className="text-xs text-slate-500 text-center mb-2 font-medium">Hour</p>
          <WheelPicker
            items={hourItems}
            selectedValue={selectedHour}
            onSelect={handleHourSelect}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-slate-200 my-8" />

        {/* Minute picker */}
        <div className="flex-1">
          <p className="text-xs text-slate-500 text-center mb-2 font-medium">Minute</p>
          <WheelPicker
            items={minuteItems}
            selectedValue={selectedMinute}
            onSelect={handleMinuteSelect}
          />
        </div>
      </div>

      {/* Display selected time */}
      {selectedHour !== null && selectedMinute !== null && (
        <div className="text-center py-3 bg-blue-50 rounded-xl border border-blue-200">
          <span className="text-2xl font-bold text-blue-600">
            {formatHour12(selectedHour)}:{formatMinute(selectedMinute)} {getAmPm(selectedHour)}
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
