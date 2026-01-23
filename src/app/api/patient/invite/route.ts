import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { escapeHtml } from '@/lib/utils/html'
import { checkRateLimit } from '@/lib/utils/rate-limit'

// This API sends patient invitation emails using Resend
// Called by therapists when inviting new patients
// Rate limited to 10 invitations per hour per therapist

export async function POST(request: NextRequest) {
  try {
    const { email, name, invitation_token } = await request.json()

    if (!email || !name || !invitation_token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the request is from an authenticated therapist
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the user is a therapist
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id, name')
      .eq('id', user.id)
      .single()

    if (!therapist) {
      return NextResponse.json(
        { error: 'Only therapists can invite patients' },
        { status: 403 }
      )
    }

    // Rate limit: 10 invitations per hour per therapist
    const rateLimitResult = checkRateLimit(`invite:${user.id}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000 // 1 hour
    })

    if (!rateLimitResult.success) {
      const resetInMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Rate limit exceeded. You can send more invitations in ${resetInMinutes} minutes.` },
        { status: 429 }
      )
    }

    // Verify the invitation exists and belongs to this therapist
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id, token')
      .eq('token', invitation_token)
      .eq('therapist_id', user.id)
      .single()

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 400 }
      )
    }

    // Build the invitation URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sleep-diary-app.vercel.app'
    const inviteUrl = `${appUrl}/invite/accept?token=${invitation_token}`

    // Check if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        // Escape user-provided data to prevent HTML injection
        const safeName = escapeHtml(name)
        const safeTherapistName = escapeHtml(therapist.name)

        const { error: emailError } = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SleepDiary <noreply@auth.patientlearningsystems.com>',
          to: email,
          subject: `${safeTherapistName} invited you to SleepDiary`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1e293b;">You're Invited to SleepDiary!</h1>
              <p style="color: #475569;">Hi ${safeName},</p>
              <p style="color: #475569;"><strong>${safeTherapistName}</strong> has invited you to join SleepDiary to support your sleep therapy journey.</p>
              <p style="color: #475569;">With SleepDiary, you'll be able to:</p>
              <ul style="color: #475569;">
                <li>Track your sleep patterns daily</li>
                <li>Share your progress with your therapist</li>
                <li>Get personalized sleep recommendations</li>
              </ul>
              <div style="margin: 32px 0;">
                <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                  Create Your Account
                </a>
              </div>
              <p style="color: #64748b; font-size: 14px;">This invitation link will expire in 7 days.</p>
              <p style="color: #64748b; font-size: 14px;">If you didn't expect this email, you can safely ignore it.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
              <p style="color: #94a3b8; font-size: 12px;">SleepDiary - CBT-I Therapy Management</p>
            </div>
          `,
        })

        if (emailError) {
          console.error('Failed to send email:', emailError)
          return NextResponse.json(
            { error: 'Failed to send invitation email', inviteUrl },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Invitation email sent successfully',
        })
      } catch (importError) {
        console.error('Resend package not available:', importError)
      }
    }

    // No email service configured, return the invite URL for manual use
    return NextResponse.json({
      success: true,
      message: 'No email service configured. Use the invite URL manually.',
      inviteUrl,
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
