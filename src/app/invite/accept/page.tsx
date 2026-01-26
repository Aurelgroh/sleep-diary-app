'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TermsConsent } from '@/components/auth/TermsConsent'
import { OnboardingTutorial } from '@/components/onboarding/OnboardingTutorial'
import { getBrowserTimezone } from '@/lib/utils/timezone'

type AcceptStep = 'loading' | 'error' | 'existing-user' | 'create-account' | 'tutorial'

interface InvitationData {
  id: string
  email: string
  name: string
  therapist_id: string
  token: string
  expires_at: string
  used_at: string | null
  therapist: { name: string }
}

function AcceptContent() {
  const [step, setStep] = useState<AcceptStep>('loading')
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'expired' | 'used' | 'invalid' | 'generic'>('generic')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [editedName, setEditedName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptDataSharing, setAcceptDataSharing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const validateInvitation = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('Invalid invitation link. Please use the link from your invitation email.')
        setErrorType('invalid')
        setStep('error')
        return
      }

      // Find the invitation with this token
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('*, therapists(name)')
        .eq('token', token)
        .single()

      if (inviteError || !inviteData) {
        setError('This invitation link is not valid. Please check your email for the correct link, or contact your therapist.')
        setErrorType('invalid')
        setStep('error')
        return
      }

      const invite = inviteData as unknown as InvitationData

      // Check if invitation has been used
      if (invite.used_at) {
        setError('This invitation has already been used. If you need to access your account, please log in.')
        setErrorType('used')
        setStep('error')
        return
      }

      // Check if invitation has expired
      if (new Date(invite.expires_at) < new Date()) {
        setError('This invitation has expired. Invitation links are valid for 7 days. Please contact your therapist to request a new invitation.')
        setErrorType('expired')
        setStep('error')
        return
      }

      setInvitation(invite)
      setEditedName(invite.name)

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // User is logged in - check if they're trying to accept with correct email
        if (user.email === invite.email) {
          // Same email - can proceed to link account
          await handleExistingUserAccept(user.id, invite)
        } else {
          // Different email - show existing user message
          setStep('existing-user')
        }
      } else {
        // Check if email already has an account
        // We can't check this directly, so we'll handle it during signup
        setStep('create-account')
      }
    }

    validateInvitation()
  }, [searchParams, supabase])

  const handleExistingUserAccept = async (userId: string, invite: InvitationData) => {
    setLoading(true)

    // Check if patient already exists
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, therapist_id, onboarding_completed_at')
      .eq('id', userId)
      .single()

    if (existingPatient) {
      if (existingPatient.therapist_id === invite.therapist_id) {
        // Already linked to this therapist
        if (existingPatient.onboarding_completed_at) {
          router.push('/patient')
        } else {
          setPatientId(userId)
          setStep('tutorial')
        }
        return
      } else {
        // Linked to different therapist
        setError('Your account is already linked to a different therapist. Please contact support for assistance.')
        setStep('error')
        return
      }
    }

    // Create patient record via API (bypasses RLS)
    try {
      console.log('Calling patient setup API (existing user) with:', {
        user_id: userId,
        email: invite.email,
        name: invite.name,
        therapist_id: invite.therapist_id,
        invitation_id: invite.id,
      })

      const setupResponse = await fetch('/api/patient/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          email: invite.email,
          name: invite.name,
          therapist_id: invite.therapist_id,
          invitation_id: invite.id,
          timezone: getBrowserTimezone(),
        }),
      })

      const setupResult = await setupResponse.json()
      console.log('Patient setup API response:', setupResponse.status, setupResult)

      if (!setupResponse.ok) {
        setError(setupResult.error || 'Failed to complete registration. Please try again or contact support.')
        setStep('error')
        return
      }
    } catch (fetchError) {
      console.error('Patient setup fetch error:', fetchError)
      setError('Failed to connect to setup service. Please try again.')
      setStep('error')
      return
    }

    setPatientId(userId)
    setStep('tutorial')
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invitation) return

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!acceptTerms) {
      setError('You must accept the terms and conditions')
      return
    }

    if (!acceptDataSharing) {
      setError('You must consent to data sharing with your therapist')
      return
    }

    setLoading(true)
    setError(null)

    // Create the auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name: editedName,
          role: 'patient',
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        // User exists - show existing user flow
        setStep('existing-user')
        setLoading(false)
        return
      }
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Failed to create account')
      setLoading(false)
      return
    }

    // Create patient record via API (bypasses RLS)
    try {
      console.log('Calling patient setup API with:', {
        user_id: authData.user.id,
        email: invitation.email,
        name: editedName,
        therapist_id: invitation.therapist_id,
        invitation_id: invitation.id,
      })

      const setupResponse = await fetch('/api/patient/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authData.user.id,
          email: invitation.email,
          name: editedName,
          therapist_id: invitation.therapist_id,
          invitation_id: invitation.id,
          timezone: getBrowserTimezone(),
        }),
      })

      const setupResult = await setupResponse.json()
      console.log('Patient setup API response:', setupResponse.status, setupResult)

      if (!setupResponse.ok) {
        console.error('Patient creation error:', setupResult)
        setError(`Account created but setup failed: ${setupResult.error || 'Unknown error'}. Please contact your therapist.`)
        setLoading(false)
        return
      }
    } catch (fetchError) {
      console.error('Patient setup fetch error:', fetchError)
      setError('Account created but failed to connect to setup service. Please try logging in.')
      setLoading(false)
      return
    }

    setPatientId(authData.user.id)

    // If session exists (no email confirmation), go to tutorial
    if (authData.session) {
      setStep('tutorial')
    } else {
      // Email confirmation required - redirect to login
      router.push('/auth/login?message=Please check your email to confirm your account')
    }
  }

  const handleTutorialComplete = async () => {
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
          <p className="text-slate-600">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    const iconColor = errorType === 'expired' ? 'amber' : 'red'
    const titles: Record<string, string> = {
      expired: 'Invitation Expired',
      used: 'Invitation Already Used',
      invalid: 'Invalid Invitation Link',
      generic: 'Something Went Wrong',
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className={`w-16 h-16 bg-${iconColor}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
            {errorType === 'expired' ? (
              <svg className={`w-8 h-8 text-${iconColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className={`w-8 h-8 text-${iconColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{titles[errorType]}</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href={errorType === 'used' ? '/auth/login' : '/'}
            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            {errorType === 'used' ? 'Log In' : 'Return to Home'}
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'existing-user') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Welcome Back!</h2>
          <p className="text-slate-600 mb-6">
            You already have a Sleep Diary account. Log in to connect with{' '}
            <span className="font-medium">{invitation?.therapist?.name || 'your therapist'}</span>.
          </p>
          <div className="space-y-3">
            <Link
              href={`/auth/login?redirect=/invite/accept?token=${searchParams.get('token')}`}
              className="block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Log In
            </Link>
            <button
              onClick={async () => {
                if (!invitation) return
                setLoading(true)
                const { error } = await supabase.auth.signInWithOtp({
                  email: invitation.email,
                  options: {
                    emailRedirectTo: `${window.location.origin}/invite/accept?token=${searchParams.get('token')}`,
                  },
                })
                if (error) {
                  setError(error.message)
                } else {
                  setError(null)
                  alert('Check your email for a magic link!')
                }
                setLoading(false)
              }}
              disabled={loading}
              className="block w-full py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>
          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    )
  }

  if (step === 'tutorial') {
    return <OnboardingTutorial onComplete={handleTutorialComplete} />
  }

  // create-account step
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🌙</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Welcome to Sleep Diary!</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              <span className="font-medium">{invitation?.therapist?.name}</span> has invited you to start your sleep therapy journey.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={invitation?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter your name"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This is how your therapist will see you</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Create a password"
                minLength={8}
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Confirm your password"
                minLength={8}
                required
              />
            </div>

            <div className="pt-2">
              <TermsConsent
                acceptTerms={acceptTerms}
                setAcceptTerms={setAcceptTerms}
                acceptDataSharing={acceptDataSharing}
                setAcceptDataSharing={setAcceptDataSharing}
                showDataSharing={true}
                therapistName={invitation?.therapist?.name}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !acceptTerms || !acceptDataSharing}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <AcceptContent />
    </Suspense>
  )
}
