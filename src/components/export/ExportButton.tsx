'use client'

import { useState } from 'react'

interface DiaryEntry {
  id: string
  date: string
  ttb: string | null
  tts: string | null
  tfa: string | null
  tob: string | null
  tst: number | null
  tib: number | null
  se: number | null
  sol: number | null
  waso: number | null
  ema: number | null
  twt: number | null
  awakenings: number | null
  quality_rating: number | null
}

interface ExportButtonProps {
  entries: DiaryEntry[]
  patientName: string
}

function formatTimeFromISO(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export function ExportButton({ entries, patientName }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const exportToCSV = () => {
    setExporting(true)

    try {
      // Headers
      const headers = [
        'Date',
        'Time to Bed (TTB)',
        'Time to Sleep (TTS)',
        'Time Final Awakening (TFA)',
        'Time Out of Bed (TOB)',
        'Time in Bed (TIB)',
        'Total Sleep Time (TST)',
        'Total Wake Time (TWT)',
        'Sleep Onset Latency (SOL)',
        'Awakenings (NWAK)',
        'Wake After Sleep Onset (WASO)',
        'Early Morning Awakening (EMA)',
        'Sleep Efficiency (SE%)',
        'Quality (1-5)'
      ]

      // Data rows
      const rows = [...entries]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(entry => [
          entry.date,
          formatTimeFromISO(entry.ttb),
          formatTimeFromISO(entry.tts),
          formatTimeFromISO(entry.tfa),
          formatTimeFromISO(entry.tob),
          formatDuration(entry.tib),
          formatDuration(entry.tst),
          entry.twt !== null ? entry.twt : '',
          entry.sol !== null ? entry.sol : '',
          entry.awakenings !== null ? entry.awakenings : '',
          entry.waso !== null ? entry.waso : '',
          entry.ema !== null ? entry.ema : '',
          entry.se !== null ? Math.round(entry.se) : '',
          entry.quality_rating !== null ? entry.quality_rating : ''
        ])

      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // Escape cells containing commas or quotes
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      const fileName = `${patientName.replace(/\s+/g, '_')}_sleep_diary_${new Date().toISOString().split('T')[0]}.csv`

      link.setAttribute('href', url)
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <button
      onClick={exportToCSV}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition text-sm disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  )
}
