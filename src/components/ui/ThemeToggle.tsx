'use client'

import { useTheme } from '@/lib/theme/ThemeProvider'

const themes = ['system', 'light', 'dark'] as const

const themeLabels = {
  system: 'System theme',
  light: 'Light theme', 
  dark: 'Dark theme'
} as const

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length]

  return (
    <button
      onClick={cycleTheme}
      className={`p-2 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring min-h-[44px] min-w-[44px] flex items-center justify-center ${className}`}
      title={`Current: ${themeLabels[theme]}. Click to switch to ${themeLabels[nextTheme]}`}
      aria-label={`Current theme: ${themeLabels[theme]}. Click to switch to ${themeLabels[nextTheme]}`}
    >
      {theme === 'light' && (
        <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
      {theme === 'dark' && (
        <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
      {theme === 'system' && (
        <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}
