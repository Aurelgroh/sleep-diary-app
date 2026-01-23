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
      .select('id, name, email')
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
          replyTo: therapist.email || undefined,
          to: email,
          subject: `${safeTherapistName} has invited you to join SleepDiary`,
          // Plain text version improves deliverability
          text: `Hi ${safeName},

${safeTherapistName} has invited you to join SleepDiary to support your sleep therapy journey.

With SleepDiary, you can:
- Track your sleep patterns daily
- Share your progress with your therapist
- Get personalized sleep recommendations

Create your account here: ${inviteUrl}

This invitation link will expire in 7 days.

If you didn't expect this email, you can safely ignore it.

---
SleepDiary - Sleep Therapy Management
This email was sent because ${safeTherapistName} invited you to SleepDiary.`,
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to SleepDiary</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 24px 0;">You're invited to SleepDiary</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi ${safeName},</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;"><strong>${safeTherapistName}</strong> has invited you to join SleepDiary to support your sleep therapy journey.</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">With SleepDiary, you can:</p>
              <ul style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; padding-left: 20px;">
                <li>Track your sleep patterns daily</li>
                <li>Share your progress with your therapist</li>
                <li>Get personalized sleep recommendations</li>
              </ul>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td style="background-color: #2563eb; border-radius: 8px;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 16px;">Create Your Account</a>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 8px 0;">This invitation link will expire in 7 days.</p>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">If you didn't expect this email, you can safely ignore it.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">SleepDiary - Sleep Therapy Management</p>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 8px 0 0 0;">This email was sent because ${safeTherapistName} invited you to SleepDiary.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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
