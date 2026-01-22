'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type SetupStep = 'loading' | 'error' | 'setup' | 'success'

interface InviteData {
  id: string
  email: string
  name: string
  credentials: string | null
  setup_token: string
  setup_token_expires_at: string
}

function SetupContent() {
  const [step, setStep] = useState<SetupStep>('loading')
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('Invalid setup link. Please use the link from your invitation email.')
        setStep('error')
        return
      }

      // Find invite with this setup token
      const { data, error: fetchError } = await supabase
        .from('therapist_invites')
        .select('id, email, name, credentials, setup_token, setup_token_expires_at')
        .eq('setup_token', token)
        .single()

      if (fetchError || !data) {
        setError('Invalid or expired setup link. Please contact the administrator for a new invitation.')
        setStep('error')
        return
      }

      // Check if token expired
      if (data.setup_token_expires_at && new Date(data.setup_token_expires_at) < new Date()) {
        setError('This setup link has expired. Please contact the administrator for a new invitation.')
        setStep('error')
        return
      }

      // Check if email already has a therapist account
      const { data: existingTherapist } = await supabase
        .from('therapists')
        .select('id')
        .eq('email', data.email)
        .single()

      if (existingTherapist) {
        setError('An account with this email already exists. Please log in instead.')
        setStep('error')
        return
      }

      setInvite(data as InviteData)
      setStep('setup')
    }

    validateToken()
  }, [searchParams, supabase])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()

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

    setLoading(true)
    setError(null)

    try {
      // Create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite!.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: invite!.name,
            role: 'therapist',
            credentials: invite!.credentials,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists. Please log in instead.')
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Failed to create account')
        setLoading(false)
        return
      }

      // Create the therapist record
      const { error: insertError } = await supabase
        .from('therapists')
        .insert({
          id: authData.user.id,
          email: invite!.email,
          name: invite!.name,
          credentials: invite!.credentials,
          status: 'active',
          activated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Failed to create therapist:', insertError)
        setError('Account created but failed to complete setup. Please contact support.')
        setLoading(false)
        return
      }

      // Delete the invite
      await supabase
        .from('therapist_invites')
        .delete()
        .eq('id', invite!.id)

      // If email confirmation is disabled, user is already logged in
      if (authData.session) {
        router.push('/therapist')
        router.refresh()
      } else {
        // Email confirmation required
        setStep('success')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Validating your setup link...</p>
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
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Setup Link Invalid</h2>
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

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Account Created!</h2>
          <p className="text-slate-600 mb-6">
            Please check your email to confirm your account, then you can log in.
          </p>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome, {invite?.name}!</h1>
            <p className="text-slate-600 mt-2">Set up your account to get started</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={invite?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>

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
                placeholder="Enter your password"
                minLength={8}
                required
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Confirm your password"
                minLength={8}
                required
              />
            </div>

            <div className="flex items-start gap-3 py-2">
              <input
                id="terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-slate-600">
                I agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !acceptTerms}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up account...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <SetupContent />
    </Suspense>
  )
}
