'use client'

interface MultipleChoiceOption {
  value: string | number
  label: string
}

interface MultipleChoiceProps {
  value: string | number | undefined
  onChange: (value: string | number) => void
  options: MultipleChoiceOption[]
  label?: string
  error?: string
}

export function MultipleChoice({ value, onChange, options, label, error }: MultipleChoiceProps) {
  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}

      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`py-4 px-4 rounded-xl text-left font-medium transition-all flex items-center justify-between ${
              value === option.value
                ? 'bg-blue-600 text-white ring-2 ring-blue-700 ring-offset-2'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>{option.label}</span>
            {value === option.value && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
