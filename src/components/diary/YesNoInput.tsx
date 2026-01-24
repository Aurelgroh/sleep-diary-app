'use client'

interface YesNoInputProps {
  value: boolean | undefined
  onChange: (value: boolean) => void
  label?: string
  error?: string
}

export function YesNoInput({ value, onChange, label, error }: YesNoInputProps) {
  const labelId = 'yes-no-label'
  const errorId = 'yes-no-error'

  return (
    <div className="space-y-4">
      {label && (
        <label id={labelId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}

      <div 
        role="radiogroup" 
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={error ? errorId : undefined}
        className="grid grid-cols-2 gap-4"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === true}
          onClick={() => onChange(true)}
          className={`py-6 px-4 rounded-xl text-lg font-medium transition-all min-h-[44px] focus-ring ${
            value === true
              ? 'bg-green-500 text-white ring-2 ring-green-600 ring-offset-2 dark:ring-offset-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span className="text-2xl mb-1 block" aria-hidden="true">{value === true ? '✓' : ''}</span>
          Yes
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={value === false}
          onClick={() => onChange(false)}
          className={`py-6 px-4 rounded-xl text-lg font-medium transition-all min-h-[44px] focus-ring ${
            value === false
              ? 'bg-slate-600 text-white ring-2 ring-slate-700 ring-offset-2 dark:ring-offset-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span className="text-2xl mb-1 block" aria-hidden="true">{value === false ? '✗' : ''}</span>
          No
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
