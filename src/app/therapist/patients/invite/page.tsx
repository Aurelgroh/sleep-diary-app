'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InvitePatientPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get current user (therapist)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to invite patients')
        setLoading(false)
        return
      }

      // Check if there's already a pending invitation for this email
      const { data: existingInvite } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('therapist_id', user.id)
        .single()

      if (existingInvite) {
        setError('An invitation has already been sent to this email')
        setLoading(false)
        return
      }

      // Check if patient already exists
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('email', email)
        .single()

      if (existingPatient) {
        setError('A patient with this email already exists')
        setLoading(false)
        return
      }

      // Create invitation record
      const { data: invitation, error: insertError } = await supabase
        .from('invitations')
        .insert({
          email,
          name,
          therapist_id: user.id,
        })
        .select('token')
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      // Send invitation email via custom API (uses Resend)
      const emailResponse = await fetch('/api/patient/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          invitation_token: invitation.token,
        }),
      })

      if (!emailResponse.ok) {
        const emailResult = await emailResponse.json()
        // Delete the invitation if email fails
        await supabase.from('invitations').delete().eq('token', invitation.token)
        setError(emailResult.error || 'Failed to send invitation email')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Invitation Sent!</h2>
          <p className="text-slate-600 mb-6">
            An invitation email has been sent to <strong>{email}</strong>.
            They&apos;ll receive a link to create their account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false)
                setName('')
                setEmail('')
              }}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Invite Another
            </button>
            <Link
              href="/therapist/patients"
              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
            >
              View Patients
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <Link
          href="/therapist/patients"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Patients
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Invite Patient</h1>
        <p className="text-slate-600 mb-6">
          Send an invitation email to a new patient. They&apos;ll create their account and be linked to you.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Patient Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Patient Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="patient@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending invitation...' : 'Send Invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}
