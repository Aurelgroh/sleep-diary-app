import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PatientHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get patient data with current prescription
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', user!.id)
    .single()

  // Get current prescription
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', user!.id)
    .lte('effective_date', new Date().toISOString().split('T')[0])
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  // Check if diary was logged today
  const today = new Date().toISOString().split('T')[0]
  const { data: todayEntry } = await supabase
    .from('diary_entries')
    .select('id')
    .eq('patient_id', user!.id)
    .eq('date', today)
    .single()

  const hasLoggedToday = !!todayEntry

  // Get this week's average SE
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { data: weekEntries } = await supabase
    .from('diary_entries')
    .select('se')
    .eq('patient_id', user!.id)
    .gte('date', weekAgo.toISOString().split('T')[0])

  const avgSE = weekEntries && weekEntries.length > 0
    ? Math.round(weekEntries.reduce((sum, e) => sum + (e.se || 0), 0) / weekEntries.length)
    : null

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Hello, {patient?.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-600 mt-1">
          {hasLoggedToday ? "You've logged your sleep today" : "Don't forget to log your sleep"}
        </p>
      </div>

      {/* Log sleep CTA */}
      {!hasLoggedToday && (
        <Link
          href="/patient/diary"
          className="block bg-blue-600 text-white rounded-2xl p-6 hover:bg-blue-700 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">Log Your Sleep</p>
              <p className="text-blue-100 text-sm mt-1">Takes less than 2 minutes</p>
            </div>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Sleep prescription */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
          Your Sleep Window
        </h2>
        {prescription ? (
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{prescription.bedtime?.slice(0, 5)}</p>
              <p className="text-sm text-slate-500 mt-1">Bedtime</p>
            </div>
            <div className="w-12 h-0.5 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{prescription.wake_time?.slice(0, 5)}</p>
              <p className="text-sm text-slate-500 mt-1">Wake time</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-500">No prescription set yet</p>
            <p className="text-sm text-slate-400 mt-1">Your therapist will set this after baseline</p>
          </div>
        )}
      </div>

      {/* This week's stats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
          This Week
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-3xl font-bold text-slate-900">
              {avgSE !== null ? `${avgSE}%` : '--'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Avg Sleep Efficiency</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-3xl font-bold text-slate-900">
              {weekEntries?.length || 0}/7
            </p>
            <p className="text-sm text-slate-500 mt-1">Days Logged</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
          Treatment Status
        </h2>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            patient?.status === 'baseline' ? 'bg-amber-500' : 'bg-green-500'
          }`}></div>
          <span className="text-slate-900 font-medium">
            {patient?.status === 'baseline'
              ? 'Baseline Period'
              : `Session ${patient?.current_session || 0}`}
          </span>
        </div>
        {patient?.status === 'baseline' && (
          <p className="text-sm text-slate-500 mt-2">
            Keep logging your sleep daily. Your therapist will set your sleep window soon.
          </p>
        )}
      </div>
    </div>
  )
}
