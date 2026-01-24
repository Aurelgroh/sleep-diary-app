'use client'

interface FeelingScaleProps {
  value: number | undefined
  onChange: (value: number) => void
  label?: string
  error?: string
}

const FEELINGS = [
  { value: 1, emoji: '😫', label: 'Very Tired' },
  { value: 2, emoji: '😴', label: 'Tired' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Rested' },
  { value: 5, emoji: '🌟', label: 'Very Rested' }
]

export function FeelingScale({ value, onChange, label, error }: FeelingScaleProps) {
  const labelId = 'feeling-scale-label'
  const errorId = 'feeling-scale-error'

  return (
    <div className="space-y-4">
      {label && (
        <label id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}

      <div 
        role="radiogroup" 
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={error ? errorId : undefined}
        className="grid grid-cols-5 gap-2"
      >
        {FEELINGS.map((feeling) => {
          const isSelected = value === feeling.value
          return (
            <button
              key={feeling.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${feeling.label}, rating ${feeling.value} of 5`}
              onClick={() => onChange(feeling.value)}
              className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all min-h-[44px] focus-ring ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-700 ring-offset-2 dark:ring-offset-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-3xl mb-2" aria-hidden="true">{feeling.emoji}</span>
              <span className="text-xs font-medium text-center leading-tight">
                {feeling.label}
              </span>
            </button>
          )
        })}
      </div>

      {value && (
        <div className="text-center py-3 bg-slate-50 dark:bg-slate-800 rounded-lg" aria-live="polite">
          <span className="text-lg text-slate-900 dark:text-slate-100">
            <span aria-hidden="true">{FEELINGS.find(f => f.value === value)?.emoji}{' '}</span>
            <span className="font-medium">{FEELINGS.find(f => f.value === value)?.label}</span>
          </span>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
