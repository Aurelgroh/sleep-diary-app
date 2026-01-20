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
  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}

      <div className="grid grid-cols-5 gap-2">
        {FEELINGS.map((feeling) => (
          <button
            key={feeling.value}
            type="button"
            onClick={() => onChange(feeling.value)}
            className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all ${
              value === feeling.value
                ? 'bg-blue-600 text-white ring-2 ring-blue-700 ring-offset-2'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="text-3xl mb-2">{feeling.emoji}</span>
            <span className="text-xs font-medium text-center leading-tight">
              {feeling.label}
            </span>
          </button>
        ))}
      </div>

      {value && (
        <div className="text-center py-3 bg-slate-50 rounded-lg">
          <span className="text-lg">
            {FEELINGS.find(f => f.value === value)?.emoji}{' '}
            <span className="font-medium">{FEELINGS.find(f => f.value === value)?.label}</span>
          </span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
