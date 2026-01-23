import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PatientChatSection } from '@/components/chat/PatientChatSection'
import { SessionsSection } from '@/components/sessions/SessionsSection'
import { TreatmentTimeline } from '@/components/treatment/TreatmentTimeline'

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

  // Check if this is a brand new patient (no diary entries ever)
  const { count: totalEntries } = await supabase
    .from('diary_entries')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', user!.id)

  const isNewPatient = totalEntries === 0

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isNewPatient ? `Welcome, ${patient?.name?.split(' ')[0]}!` : `Hello, ${patient?.name?.split(' ')[0]}`}
          </h1>
          <p className="text-slate-600 mt-1">
            {isNewPatient
              ? "Let's start your sleep therapy journey"
              : hasLoggedToday
                ? "You've logged your sleep today"
                : "Don't forget to log your sleep"}
          </p>
        </div>
        <Link
          href="/patient/profile"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          title="Settings"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      {/* Welcome card for new patients */}
      {isNewPatient && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-2">Getting Started</h2>
          <p className="text-blue-100 text-sm mb-4">
            Your therapist has invited you to track your sleep. Here&apos;s what to do:
          </p>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Log your sleep every morning after waking up</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Your therapist will review your data and set your sleep window</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Follow your personalized sleep schedule to improve sleep</span>
            </li>
          </ol>
        </div>
      )}

      {/* Log sleep CTA */}
      {!hasLoggedToday && (
        <Link
          href="/patient/diary/new"
          className="block bg-blue-600 text-white rounded-2xl p-6 hover:bg-blue-700 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">
                {isNewPatient ? 'Log Your First Sleep Entry' : 'Log Your Sleep'}
              </p>
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
        {isNewPatient ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-500">No data yet</p>
            <p className="text-sm text-slate-400 mt-1">Log your sleep to see your stats</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Treatment Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
          Treatment Progress
        </h2>
        <TreatmentTimeline
          currentSession={patient?.current_session || 0}
          status={patient?.status || 'baseline'}
        />
      </div>

      {/* Messages */}
      <PatientChatSection patientId={user!.id} />

      {/* Sessions */}
      {patient?.therapist_id && (
        <SessionsSection
          patientId={user!.id}
          therapistId={patient.therapist_id}
          currentSession={patient.current_session || 0}
          isTherapist={false}
        />
      )}
    </div>
  )
}
