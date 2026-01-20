'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  type TitrationRecommendation,
  type Prescription,
  getActionBadgeClass,
  getActionLabel,
  formatPrescriptionTime,
  calculateWindowMinutes,
  DEFAULT_MIN_WINDOW
} from '@/lib/sleep-diary/titration'
import { formatSE, getSEColorClass } from '@/lib/sleep-diary/metrics'

interface PrescriptionFormProps {
  patientId: string
  currentPrescription: Prescription | null
  recommendation: TitrationRecommendation
  suggestedPrescription: { bedtime: string; wake_time: string; window_minutes: number } | null
  prescriptionHistory: Prescription[]
  weeklyAvgSE: number | null
  daysLogged: number
}

export function PrescriptionForm({
  patientId,
  currentPrescription,
  recommendation,
  suggestedPrescription,
  prescriptionHistory,
  weeklyAvgSE,
  daysLogged
}: PrescriptionFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Initialize form with current or suggested values
  const [bedtime, setBedtime] = useState(
    suggestedPrescription?.bedtime || currentPrescription?.bedtime || '23:00'
  )
  const [wakeTime, setWakeTime] = useState(
    suggestedPrescription?.wake_time || currentPrescription?.wake_time || '07:00'
  )
  const [minWindow, setMinWindow] = useState(DEFAULT_MIN_WINDOW)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const windowMinutes = calculateWindowMinutes(bedtime, wakeTime)
  const windowHours = windowMinutes / 60

  const handleApplyRecommendation = () => {
    if (suggestedPrescription) {
      setBedtime(suggestedPrescription.bedtime)
      setWakeTime(suggestedPrescription.wake_time)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validate minimum window
    if (windowMinutes < minWindow) {
      setError(`Sleep window cannot be less than ${minWindow / 60} hours`)
      setIsSubmitting(false)
      return
    }

    try {
      // Get current user for created_by field
      const { data: { user } } = await supabase.auth.getUser()

      const { error: insertError } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: patientId,
          bedtime,
          wake_time: wakeTime,
          window_minutes: windowMinutes,
          effective_date: effectiveDate,
          created_by: user!.id,
          notes: notes || null
        })

      if (insertError) {
        setError(insertError.message)
        setIsSubmitting(false)
        return
      }

      // Update patient status if in baseline
      const { data: patient } = await supabase
        .from('patients')
        .select('status, current_session')
        .eq('id', patientId)
        .single()

      if (patient?.status === 'baseline') {
        await supabase
          .from('patients')
          .update({ status: 'active', current_session: 1 })
          .eq('id', patientId)
      }

      router.push(`/therapist/patients/${patientId}`)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Week's Data */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">This Week&apos;s Data</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Avg Sleep Efficiency</p>
            <p className={`text-2xl font-bold ${getSEColorClass(weeklyAvgSE)}`}>
              {formatSE(weeklyAvgSE)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Days Logged</p>
            <p className="text-2xl font-bold text-slate-900">{daysLogged}/7</p>
          </div>
        </div>

        {/* SE Thresholds Guide */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2">Titration Guidelines</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">≥90%: Increase</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">85-89%: Maintain</span>
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">80-84%: Review</span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">&lt;80%: Decrease</span>
          </div>
        </div>
      </div>

      {/* Titration Recommendation */}
      {daysLogged >= 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Recommendation</h2>
              <p className="text-sm text-slate-500">Based on {daysLogged} days of data</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getActionBadgeClass(recommendation.action)}`}>
              {getActionLabel(recommendation.action)}
            </span>
          </div>
          <p className="text-slate-600 mb-4">{recommendation.reason}</p>

          {(recommendation.action === 'increase' || recommendation.action === 'decrease') && suggestedPrescription && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-xs text-slate-500">Suggested Window</p>
                <p className="font-medium">
                  {formatPrescriptionTime(suggestedPrescription.bedtime)} → {formatPrescriptionTime(suggestedPrescription.wake_time)}
                </p>
                <p className="text-sm text-slate-500">
                  ({Math.round(suggestedPrescription.window_minutes / 60 * 10) / 10} hours)
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyRecommendation}
                className="ml-auto px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prescription Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <h2 className="font-semibold text-slate-900">
          {currentPrescription ? 'Update Prescription' : 'Set Initial Prescription'}
        </h2>

        {/* Current Prescription Display */}
        {currentPrescription && (
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-2">Current Prescription</p>
            <p className="font-medium">
              {formatPrescriptionTime(currentPrescription.bedtime)} → {formatPrescriptionTime(currentPrescription.wake_time)}
            </p>
            <p className="text-sm text-slate-500">
              {Math.round(currentPrescription.window_minutes / 60 * 10) / 10} hours
              (since {new Date(currentPrescription.effective_date).toLocaleDateString()})
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Bedtime */}
          <div>
            <label htmlFor="bedtime" className="block text-sm font-medium text-slate-700 mb-2">
              Bedtime
            </label>
            <input
              type="time"
              id="bedtime"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Wake Time */}
          <div>
            <label htmlFor="wakeTime" className="block text-sm font-medium text-slate-700 mb-2">
              Wake Time
            </label>
            <input
              type="time"
              id="wakeTime"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Window Duration Display */}
        <div className="p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-slate-600">Sleep Window Duration</p>
          <p className="text-2xl font-bold text-blue-600">
            {Math.floor(windowHours)}h {Math.round((windowHours % 1) * 60)}m
          </p>
          {windowMinutes < minWindow && (
            <p className="text-sm text-red-600 mt-1">
              Below minimum ({minWindow / 60} hours)
            </p>
          )}
        </div>

        {/* Minimum Window */}
        <div>
          <label htmlFor="minWindow" className="block text-sm font-medium text-slate-700 mb-2">
            Minimum Window Floor (hours)
          </label>
          <select
            id="minWindow"
            value={minWindow}
            onChange={(e) => setMinWindow(Number(e.target.value))}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={270}>4.5 hours</option>
            <option value={300}>5 hours</option>
            <option value={330}>5.5 hours</option>
            <option value={360}>6 hours</option>
          </select>
        </div>

        {/* Effective Date */}
        <div>
          <label htmlFor="effectiveDate" className="block text-sm font-medium text-slate-700 mb-2">
            Effective Date
          </label>
          <input
            type="date"
            id="effectiveDate"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Reason for adjustment, patient factors, etc."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 px-6 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || windowMinutes < minWindow}
            className="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Prescription'}
          </button>
        </div>
      </form>

      {/* Prescription History */}
      {prescriptionHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Prescription History</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {prescriptionHistory.map((rx, index) => (
              <div key={rx.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {formatPrescriptionTime(rx.bedtime)} → {formatPrescriptionTime(rx.wake_time)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {Math.round(rx.window_minutes / 60 * 10) / 10} hours
                  </p>
                  {rx.notes && (
                    <p className="text-sm text-slate-400 mt-1">{rx.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">
                    {new Date(rx.effective_date).toLocaleDateString()}
                  </p>
                  {index === 0 && (
                    <span className="text-xs text-green-600 font-medium">Current</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
