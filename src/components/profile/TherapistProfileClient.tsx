'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TherapistProfileClientProps {
  therapist: {
    id: string
    name: string
    email: string
    credentials: string | null
    timezone: string
    status: string
    created_at: string
    activated_at: string | null
  }
  userEmail: string
  patientCount: number
}

export function TherapistProfileClient({ therapist, userEmail, patientCount }: TherapistProfileClientProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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
        body: JSON.stringify({ user_id: therapist.id, user_type: 'therapist' }),
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Name</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{therapist.name}</p>
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{userEmail}</p>
            </div>
          </div>
          {therapist.credentials && (
            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Credentials</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{therapist.credentials}</p>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Timezone</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{therapist.timezone}</p>
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Account Status</p>
              <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">{therapist.status}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              therapist.status === 'active' ? 'bg-green-100 text-green-700' :
              therapist.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {therapist.status}
            </span>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Member since</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatDate(therapist.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Practice Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Practice Overview</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">{patientCount}</span>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Active Patients</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Currently under your care</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account Actions</h2>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
            >
              Delete Account
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
              This will permanently delete your account and all associated data.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6">
            {deleteStep === 1 && (
              <>
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center mb-2">Delete Account?</h3>
                <p className="text-slate-600 dark:text-slate-300 text-center mb-4">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>

                {patientCount > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 font-medium text-sm">
                      Warning: You have {patientCount} active patient{patientCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                      Patient data will be preserved, but they will need to be reassigned to another therapist.
                    </p>
                  </div>
                )}

                <ul className="text-sm text-slate-600 dark:text-slate-300 mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Your therapist profile
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Session notes and prescriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Messages with patients
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Your login credentials
                  </li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center mb-2">Final Confirmation</h3>
                <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
                  Type <span className="font-mono font-bold text-red-600">DELETE MY ACCOUNT</span> to confirm:
                </p>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type here..."
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition mb-6 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDeleteStep(1)
                      setDeleteConfirmText('')
                      setError(null)
                    }}
                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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
        <Link href="/therapist" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>
    </>
  )
}
