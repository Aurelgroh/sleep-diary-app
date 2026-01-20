'use client'

interface YesNoInputProps {
  value: boolean | undefined
  onChange: (value: boolean) => void
  label?: string
  error?: string
}

export function YesNoInput({ value, onChange, label, error }: YesNoInputProps) {
  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`py-6 px-4 rounded-xl text-lg font-medium transition-all ${
            value === true
              ? 'bg-green-500 text-white ring-2 ring-green-600 ring-offset-2'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span className="text-2xl mb-1 block">{value === true ? '✓' : ''}</span>
          Yes
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`py-6 px-4 rounded-xl text-lg font-medium transition-all ${
            value === false
              ? 'bg-slate-600 text-white ring-2 ring-slate-700 ring-offset-2'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span className="text-2xl mb-1 block">{value === false ? '✗' : ''}</span>
          No
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
