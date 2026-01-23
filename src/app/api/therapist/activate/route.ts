import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { escapeHtml } from '@/lib/utils/html'

// This API is called by admin to send activation emails to therapists
// Requires SUPABASE_SERVICE_ROLE_KEY environment variable
// Optionally requires RESEND_API_KEY for email sending

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization (you may want to add proper admin auth here)
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_API_KEY

    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { invite_id } = await request.json()

    if (!invite_id) {
      return NextResponse.json(
        { error: 'invite_id is required' },
        { status: 400 }
      )
    }

    // Create admin Supabase client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get invite details
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('therapist_invites')
      .select('id, email, name, setup_token, setup_token_expires_at')
      .eq('id', invite_id)
      .single()

    if (fetchError || !invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    // Check if already a therapist with this email
    const { data: existingTherapist } = await supabaseAdmin
      .from('therapists')
      .select('id')
      .eq('email', invite.email)
      .single()

    if (existingTherapist) {
      return NextResponse.json(
        { error: 'A therapist account with this email already exists' },
        { status: 400 }
      )
    }

    // Regenerate setup token if expired
    let setupToken = invite.setup_token
    if (invite.setup_token_expires_at && new Date(invite.setup_token_expires_at) < new Date()) {
      setupToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiry

      const { error: updateError } = await supabaseAdmin
        .from('therapist_invites')
        .update({
          setup_token: setupToken,
          setup_token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', invite_id)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to regenerate setup token' },
          { status: 500 }
        )
      }
    }

    // Send activation email
    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/setup?token=${setupToken}`

    // Check if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        // Dynamic import to avoid build errors if resend isn't installed
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        // Escape user-provided data to prevent HTML injection
        const safeName = escapeHtml(invite.name)

        const { error: emailError } = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SleepDiary <noreply@auth.patientlearningsystems.com>',
          to: invite.email,
          subject: 'Set up your SleepDiary therapist account',
          text: `Hi ${safeName},

Your therapist account has been created. Visit the link below to set your password and complete your account setup.

Set up your account: ${setupUrl}

This link will expire in 30 days.

If you didn't expect this email, you can safely ignore it.

---
SleepDiary - Sleep Therapy Management`,
          html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set up your SleepDiary account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 24px 0;">Welcome to SleepDiary</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi ${safeName},</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Your therapist account has been created. Click the button below to set your password and complete your account setup.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td style="background-color: #2563eb; border-radius: 8px;">
                    <a href="${setupUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 16px;">Set Up Account</a>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 8px 0;">This link will expire in 30 days.</p>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">If you didn't expect this email, you can safely ignore it.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">SleepDiary - Sleep Therapy Management</p>
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
            { error: 'Failed to send activation email', setupUrl },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Activation email sent successfully',
        })
      } catch (importError) {
        console.error('Resend package not available:', importError)
        // Fall through to return setup URL
      }
    }

    // No email service configured or available, return the setup URL for manual use
    return NextResponse.json({
      success: true,
      message: 'No email service configured. Use the setup URL manually.',
      setupUrl,
    })
  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
