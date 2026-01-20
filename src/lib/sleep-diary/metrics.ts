/**
 * Sleep diary metrics calculation utilities
 * Used by therapist dashboard to display weekly summaries and comparisons
 */

export interface DiaryEntry {
  id: string
  date: string
  tst: number | null  // Total Sleep Time (minutes)
  tib: number | null  // Time in Bed (minutes)
  se: number | null   // Sleep Efficiency (%)
  sol: number | null  // Sleep Onset Latency (minutes)
  waso: number | null // Wake After Sleep Onset (minutes)
  ema: number | null  // Early Morning Awakening (minutes)
  twt: number | null  // Total Wake Time (minutes)
  quality_rating: number | null
  ttb: string | null  // Time to Bed (ISO)
  tts: string | null  // Time to Sleep (ISO)
  tfa: string | null  // Time of Final Awakening (ISO)
  tob: string | null  // Time Out of Bed (ISO)
}

export interface WeeklyMetrics {
  avgTst: number | null
  avgTib: number | null
  avgSe: number | null
  avgSol: number | null
  avgWaso: number | null
  avgEma: number | null
  avgTwt: number | null
  avgQuality: number | null
  daysLogged: number
  totalDays: number
}

export interface MetricsComparison {
  current: WeeklyMetrics
  previous: WeeklyMetrics | null
  baseline: WeeklyMetrics | null
  seChange: number | null        // % change from previous week
  seBaselineChange: number | null // % change from baseline
}

/**
 * Calculate average of non-null values
 */
function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
}

/**
 * Calculate weekly metrics from diary entries
 */
export function calculateWeeklyMetrics(entries: DiaryEntry[], totalDays: number = 7): WeeklyMetrics {
  return {
    avgTst: avg(entries.map(e => e.tst)),
    avgTib: avg(entries.map(e => e.tib)),
    avgSe: avg(entries.map(e => e.se)),
    avgSol: avg(entries.map(e => e.sol)),
    avgWaso: avg(entries.map(e => e.waso)),
    avgEma: avg(entries.map(e => e.ema)),
    avgTwt: avg(entries.map(e => e.twt)),
    avgQuality: avg(entries.map(e => e.quality_rating)),
    daysLogged: entries.length,
    totalDays
  }
}

/**
 * Format minutes as hours and minutes (e.g., "5h 30m")
 */
export function formatDurationHM(minutes: number | null): string {
  if (minutes === null) return '--'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Format sleep efficiency percentage
 */
export function formatSE(se: number | null): string {
  if (se === null) return '--'
  return `${Math.round(se)}%`
}

/**
 * Get color class for sleep efficiency
 */
export function getSEColorClass(se: number | null): string {
  if (se === null) return 'text-slate-500'
  if (se >= 90) return 'text-green-600'
  if (se >= 85) return 'text-emerald-600'
  if (se >= 80) return 'text-amber-600'
  return 'text-red-600'
}

/**
 * Get SE badge style
 */
export function getSEBadgeClass(se: number | null): string {
  if (se === null) return 'bg-slate-100 text-slate-600'
  if (se >= 90) return 'bg-green-100 text-green-700'
  if (se >= 85) return 'bg-emerald-100 text-emerald-700'
  if (se >= 80) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

/**
 * Calculate change between two values
 */
export function calculateChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

/**
 * Calculate absolute difference between two values
 */
export function calculateDiff(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null
  return Math.round((current - previous) * 10) / 10
}

/**
 * Format trend arrow and value
 */
export function formatTrend(diff: number | null, inverse: boolean = false): { arrow: string; color: string; value: string } | null {
  if (diff === null) return null

  const isPositive = inverse ? diff < 0 : diff > 0
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
  const color = isPositive ? 'text-green-600' : diff === 0 ? 'text-slate-500' : 'text-red-600'
  const value = Math.abs(diff).toString()

  return { arrow, color, value }
}

/**
 * Get date range for a week (7 days ending on endDate)
 */
export function getWeekDateRange(endDate: Date): { start: Date; end: Date } {
  const end = new Date(endDate)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return { start, end }
}

/**
 * Format date range as string
 */
export function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
}

/**
 * Calculate diary completion rate as percentage
 */
export function calculateCompletionRate(logged: number, total: number): number {
  if (total === 0) return 0
  return Math.round((logged / total) * 100)
}

/**
 * Get quality emoji
 */
export function getQualityEmoji(rating: number | null): string {
  if (rating === null) return '—'
  switch (rating) {
    case 1: return '😫'
    case 2: return '😴'
    case 3: return '😐'
    case 4: return '😊'
    case 5: return '🌟'
    default: return '—'
  }
}

/**
 * Format time from ISO string
 */
export function formatTimeFromISO(isoString: string | null): string {
  if (!isoString) return '--'
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
