import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PrescriptionForm } from './PrescriptionForm'
import { calculateWeeklyMetrics, type DiaryEntry } from '@/lib/sleep-diary/metrics'
import {
  getTitrationRecommendation,
  calculateNewPrescription,
  type Prescription
} from '@/lib/sleep-diary/titration'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PrescriptionPage({ params }: PageProps) {
  const { id: patientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch patient data
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single()

  if (patientError || !patient) {
    notFound()
  }

  // Verify therapist owns this patient
  if (patient.therapist_id !== user!.id) {
    notFound()
  }

  // Fetch current prescription
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .lte('effective_date', new Date().toISOString().split('T')[0])
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  // Fetch prescription history
  const { data: prescriptionHistory } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .order('effective_date', { ascending: false })
    .limit(10)

  // Calculate this week's metrics for recommendation
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 6)

  const { data: weekEntries } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('patient_id', patientId)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', today.toISOString().split('T')[0])

  const weekMetrics = calculateWeeklyMetrics((weekEntries || []) as DiaryEntry[])

  // Calculate titration recommendation (default minimum window: 5 hours = 300 minutes)
  const DEFAULT_MIN_WINDOW = 300
  const recommendation = getTitrationRecommendation({
    weeklyAvgSE: weekMetrics.avgSe,
    daysLogged: weekMetrics.daysLogged,
    currentWindowMinutes: prescription?.window_minutes || 360,
    minWindowMinutes: DEFAULT_MIN_WINDOW
  })

  // Calculate suggested new prescription based on recommendation
  const suggestedPrescription = prescription
    ? calculateNewPrescription(
        prescription as Prescription,
        recommendation.action,
        recommendation.minutes
      )
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/therapist/patients/${patientId}`}
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to {patient.name}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sleep Prescription</h1>
        <p className="text-slate-500 mt-1">Manage {patient.name}&apos;s sleep window</p>
      </div>

      {/* Prescription Form */}
      <PrescriptionForm
        patientId={patientId}
        currentPrescription={prescription as Prescription | null}
        recommendation={recommendation}
        suggestedPrescription={suggestedPrescription}
        prescriptionHistory={(prescriptionHistory || []) as Prescription[]}
        weeklyAvgSE={weekMetrics.avgSe}
        daysLogged={weekMetrics.daysLogged}
      />
    </div>
  )
}
