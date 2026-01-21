'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OnboardingTutorial } from '@/components/onboarding/OnboardingTutorial'

type OnboardingStep = 'loading' | 'error' | 'welcome' | 'name' | 'password' | 'tutorial'

function InviteContent() {
  const [step, setStep] = useState<OnboardingStep>('loading')
  const [error, setError] = useState<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [editedName, setEditedName] = useState('')
  const [therapistName, setTherapistName] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleInvite = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('Invalid invitation link. Please use the link from your invitation email.')
        setStep('error')
        return
      }

      // Check if user is already authenticated (from magic link)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Please click the link in your invitation email to continue')
        setStep('error')
        return
      }

      setPatientId(user.id)

      // Find the invitation with this token
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*, therapists(name)')
        .eq('token', token)
        .single()

      if (inviteError || !invitation) {
        setError('Invalid or expired invitation. Please ask your therapist to send a new one.')
        setStep('error')
        return
      }

      // Verify the email matches
      if (invitation.email !== user.email) {
        setError('This invitation was sent to a different email address')
        setStep('error')
        return
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        setError('This invitation has expired. Please ask your therapist to send a new one.')
        setStep('error')
        return
      }

      setPatientName(invitation.name)
      setEditedName(invitation.name)
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
        // If patient already exists, check if they completed onboarding
        if (patientError.code === '23505') {
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('*')
            .eq('id', user.id)
            .single()

          if ((existingPatient as unknown as { onboarding_completed_at: string | null })?.onboarding_completed_at) {
            // Already completed onboarding, redirect to dashboard
            router.push('/patient')
            return
          }
          // Continue with onboarding
        } else {
          setError('Failed to complete registration. Please contact your therapist.')
          console.error(patientError)
          setStep('error')
          return
        }
      }

      // Delete the invitation
      await supabase.from('invitations').delete().eq('token', token)

      setStep('welcome')
    }

    handleInvite()
  }, [searchParams, supabase, router])

  const handleSaveName = async () => {
    if (!editedName.trim() || !patientId) return

    setSavingName(true)
    const { error: updateError } = await supabase
      .from('patients')
      .update({ name: editedName.trim() })
      .eq('id', patientId)

    if (updateError) {
      setError('Failed to update name. Please try again.')
      setSavingName(false)
      return
    }

    setPatientName(editedName.trim())
    setSavingName(false)
    setStep('password')
  }

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

    setStep('tutorial')
  }

  const handleSkipPassword = () => {
    setStep('tutorial')
  }

  const handleTutorialComplete = async () => {
    // Mark onboarding as complete (using raw query since field may not be in types yet)
    if (patientId) {
      await supabase
        .from('patients')
        .update({ onboarding_completed_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', patientId)
    }
    router.push('/patient')
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
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

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🌙</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome to Sleep Diary!
          </h1>
          <p className="text-slate-600 mb-6">
            {therapistName} has invited you to start your sleep therapy journey.
          </p>
          <button
            onClick={() => setStep('name')}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  if (step === 'name') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Confirm Your Name</h2>
          <p className="text-slate-600 mb-6">
            This is how your therapist will see you. Feel free to update it.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter your name"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleSaveName}
              disabled={savingName || !editedName.trim()}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              {savingName ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Set a Password</h2>
          <p className="text-slate-600 mb-6">
            Optional: Set a password for faster sign-in, or skip this and continue using magic links.
          </p>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
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
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={settingPassword || password.length < 8}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              {settingPassword ? 'Setting password...' : 'Set Password & Continue'}
            </button>
          </form>

          <button
            onClick={handleSkipPassword}
            className="w-full mt-3 py-3 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition"
          >
            Skip - I&apos;ll use magic links
          </button>

          <p className="text-xs text-slate-400 text-center mt-4">
            Magic links are sent to your email each time you sign in. No password needed!
          </p>
        </div>
      </div>
    )
  }

  if (step === 'tutorial') {
    return <OnboardingTutorial onComplete={handleTutorialComplete} />
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
