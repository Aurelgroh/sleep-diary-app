'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function InviteContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patientName, setPatientName] = useState<string | null>(null)
  const [therapistName, setTherapistName] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleInvite = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('Invalid invitation link. Please use the link from your invitation email.')
        setLoading(false)
        return
      }

      // Check if user is already authenticated (from magic link)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Please click the link in your invitation email to continue')
        setLoading(false)
        return
      }

      // Find the invitation with this token
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*, therapists(name)')
        .eq('token', token)
        .single()

      if (inviteError || !invitation) {
        setError('Invalid or expired invitation. Please ask your therapist to send a new one.')
        setLoading(false)
        return
      }

      // Verify the email matches
      if (invitation.email !== user.email) {
        setError('This invitation was sent to a different email address')
        setLoading(false)
        return
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        setError('This invitation has expired. Please ask your therapist to send a new one.')
        setLoading(false)
        return
      }

      setPatientName(invitation.name)
      setTherapistName((invitation.therapists as { name: string })?.name || 'your therapist')

      // Create the patient record
      const { error: patientError } = await supabase.from('patients').insert({
        id: user.id,
        email: user.email!,
        name: invitation.name,
        therapist_id: invitation.therapist_id,
        status: 'baseline',
      })

      if (patientError) {
        // If patient already exists, that's okay - just continue
        if (patientError.code !== '23505') {
          setError('Failed to complete registration. Please contact your therapist.')
          console.error(patientError)
          setLoading(false)
          return
        }
      }

      // Delete the invitation
      await supabase.from('invitations').delete().eq('token', token)

      setNeedsPassword(true)
      setLoading(false)
    }

    handleInvite()
  }, [searchParams, supabase])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingPassword(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError(error.message)
      setSettingPassword(false)
      return
    }

    router.push('/patient')
  }

  const handleSkipPassword = () => {
    router.push('/patient')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/auth/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Welcome, {patientName}!</h2>
            <p className="text-slate-600">
              Your account has been linked to {therapistName}. Set a password for easy sign-in, or skip this step.
            </p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="••••••••"
                minLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters. You can also use magic link to sign in.</p>
            </div>

            <button
              type="submit"
              disabled={settingPassword || password.length < 8}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settingPassword ? 'Setting password...' : 'Set Password & Continue'}
            </button>
          </form>

          <button
            onClick={handleSkipPassword}
            className="w-full mt-3 py-3 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
