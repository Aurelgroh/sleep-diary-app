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
  const labelId = 'multiple-choice-label'
  const errorId = 'multiple-choice-error'

  return (
    <div className="space-y-4">
      {label && (
        <label id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}

      <div 
        role="radiogroup" 
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={error ? errorId : undefined}
        className="grid grid-cols-1 gap-3"
      >
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={`py-4 px-4 rounded-xl text-left font-medium transition-all flex items-center justify-between min-h-[44px] focus-ring ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-700 ring-offset-2 dark:ring-offset-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{option.label}</span>
              {isSelected && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
