import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

function getQualityEmoji(rating: number | null): string {
  if (!rating) return '-'
  const emojis: Record<number, string> = {
    1: '😫',
    2: '😴',
    3: '😐',
    4: '😊',
    5: '🌟'
  }
  return emojis[rating] || '-'
}

export default async function DiaryHistoryPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get diary entries ordered by date (most recent first)
  const { data: entries } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('patient_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  // Check if today's entry exists (yesterday's sleep)
  const today = new Date()
  today.setDate(today.getDate() - 1)
  const sleepDate = today.toISOString().split('T')[0]
  const hasLoggedToday = entries?.some(e => e.date === sleepDate)

  // Calculate streak
  let streak = 0
  if (entries && entries.length > 0) {
    const sortedDates = entries.map(e => e.date).sort().reverse()
    const checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - 1) // Start from yesterday

    for (const dateStr of sortedDates) {
      const expectedDate = checkDate.toISOString().split('T')[0]
      if (dateStr === expectedDate) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dateStr < expectedDate) {
        break
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Success message */}
      {params.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-green-700 font-medium">Sleep diary entry saved successfully!</p>
          </div>
        </div>
      )}

      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sleep Diary</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{streak} day streak</p>
        </div>
        {!hasLoggedToday && (
          <Link
            href="/patient/diary/new"
            className="py-2 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
          >
            Log Sleep
          </Link>
        )}
      </div>

      {/* Stats summary */}
      {entries && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{entries.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Entries</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{streak}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Day Streak</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {entries.slice(0, 7).reduce((sum, e) => sum + (e.tst || 0), 0) > 0
                ? formatDuration(Math.round(entries.slice(0, 7).reduce((sum, e) => sum + (e.tst || 0), 0) / Math.min(entries.length, 7)))
                : '--'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg Sleep</p>
          </div>
        </div>
      )}

      {/* Entries list */}
      {entries && entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{formatDate(entry.date)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatTime(entry.tts)} - {formatTime(entry.tfa)}
                  </p>
                </div>
                <span className="text-2xl">{getQualityEmoji(entry.quality_rating)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Time in Bed</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{entry.tib ? formatDuration(entry.tib) : '--'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Sleep</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{entry.tst ? formatDuration(entry.tst) : '--'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Time Awake</p>
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{entry.twt ? formatDuration(entry.twt) : '--'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No entries yet</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1 mb-6">Start logging your sleep to see your history</p>
          <Link
            href="/patient/diary/new"
            className="inline-block py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
          >
            Log Your First Night
          </Link>
        </div>
      )}
    </div>
  )
}
