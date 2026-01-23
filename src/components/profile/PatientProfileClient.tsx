'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PatientProfileClientProps {
  patient: {
    id: string
    name: string
    email: string
    timezone: string
    created_at: string
    email_reminders: boolean
    reminder_time: string
  }
  therapist: {
    id: string
    name: string
    email: string
  } | null
  userEmail: string
}

export function PatientProfileClient({ patient, therapist, userEmail }: PatientProfileClientProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailReminders, setEmailReminders] = useState(patient.email_reminders)
  const [reminderTime, setReminderTime] = useState(patient.reminder_time.slice(0, 5)) // "09:00"
  const [savingReminders, setSavingReminders] = useState(false)
  const [savingTime, setSavingTime] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [reminderError, setReminderError] = useState<string | null>(null)

  const handleToggleReminders = async () => {
    const previousValue = emailReminders
    const newValue = !emailReminders
    setEmailReminders(newValue) // Optimistic update
    setSavingReminders(true)
    setReminderError(null)

    // Cast to any to handle column that may not be in generated types yet
    const { error: saveError } = await supabase
      .from('patients')
      .update({ email_reminders: newValue } as Record<string, unknown>)
      .eq('id', patient.id)

    if (saveError) {
      console.error('Failed to save reminder setting:', saveError)
      setEmailReminders(previousValue) // Rollback on error
      setReminderError('Failed to save. Please try again.')
      setTimeout(() => setReminderError(null), 3000)
    }
    setSavingReminders(false)
  }

  const [timeError, setTimeError] = useState<string | null>(null)

  const handleTimeChange = async (newTime: string) => {
    const previousTime = reminderTime
    setReminderTime(newTime) // Optimistic update
    setSavingTime(true)
    setTimeError(null)

    const { error: saveError } = await supabase
      .from('patients')
      .update({ reminder_time: newTime } as Record<string, unknown>)
      .eq('id', patient.id)

    if (saveError) {
      console.error('Failed to save reminder time:', saveError)
      setReminderTime(previousTime) // Rollback on error
      setTimeError('Failed to save. Please try again.')
      // Clear error after 3 seconds
      setTimeout(() => setTimeError(null), 3000)
    }
    setSavingTime(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" exactly to confirm')
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: patient.id, user_type: 'patient' }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete account')
      }

      await supabase.auth.signOut()
      router.push('/?deleted=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      {/* Account Information */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Account Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <div>
              <p className="text-sm text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{patient.name}</p>
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{userEmail}</p>
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <div>
              <p className="text-sm text-slate-500">Timezone</p>
              <p className="font-medium text-slate-900">{patient.timezone}</p>
            </div>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm text-slate-500">Member since</p>
              <p className="font-medium text-slate-900">{formatDate(patient.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Therapist Connection */}
      {therapist && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Your Therapist</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-blue-600">
                  {therapist.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900">{therapist.name}</p>
                <p className="text-sm text-slate-500">{therapist.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-slate-900">Daily sleep diary reminders</p>
              <p className="text-sm text-slate-500 mt-1">
                Receive a friendly email each morning to remind you to log your sleep
              </p>
            </div>
            <button
              onClick={handleToggleReminders}
              disabled={savingReminders}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailReminders ? 'bg-blue-600' : 'bg-slate-200'
              } ${savingReminders ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailReminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {reminderError && (
            <p className="text-red-500 text-sm mt-2">{reminderError}</p>
          )}

          {/* Reminder time picker - only show when reminders enabled */}
          {emailReminders && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <div className="flex-1">
                <p className="font-medium text-slate-900">Reminder time</p>
                <p className="text-sm text-slate-500 mt-1">
                  When would you like to receive your daily reminder?
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savingTime && (
                  <span className="text-xs text-slate-400">Saving...</span>
                )}
                {timeError && (
                  <span className="text-xs text-red-500">{timeError}</span>
                )}
                <select
                  value={reminderTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={savingTime}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                  <option value="06:00">6:00 AM</option>
                  <option value="07:00">7:00 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Data & Privacy</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-medium text-green-900">Data sharing consent active</p>
              <p className="text-sm text-green-700">
                You have consented to share your sleep diary data with {therapist?.name || 'your therapist'} for CBT-I treatment purposes.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Your data includes sleep logs, questionnaire responses, and progress information.
            This data is only visible to you and your therapist.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Account Actions</h2>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>

          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-3 px-4 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition"
            >
              Delete Account
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              This will permanently delete your account and all associated data.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            {deleteStep === 1 && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 text-center mb-2">Delete Account?</h3>
                <p className="text-slate-600 text-center mb-6">
                  This action cannot be undone. All your data will be permanently deleted, including:
                </p>
                <ul className="text-sm text-slate-600 mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    All sleep diary entries
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Questionnaire responses and scores
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Messages with your therapist
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Your account and profile
                  </li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 py-3 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <h3 className="text-xl font-semibold text-slate-900 text-center mb-2">Final Confirmation</h3>
                <p className="text-slate-600 text-center mb-6">
                  Type <span className="font-mono font-bold text-red-600">DELETE MY ACCOUNT</span> to confirm:
                </p>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type here..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition mb-6"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDeleteStep(1)
                      setDeleteConfirmText('')
                      setError(null)
                    }}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
                    disabled={deleting}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                    className="flex-1 py-3 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting...' : 'Delete Forever'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="text-center">
        <Link href="/patient" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>
    </>
  )
}
