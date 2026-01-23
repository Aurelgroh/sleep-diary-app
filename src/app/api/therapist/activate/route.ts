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
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1e293b;">Welcome to SleepDiary!</h1>
              <p style="color: #475569;">Hi ${safeName},</p>
              <p style="color: #475569;">Your therapist account has been created. Click the button below to set your password and complete your account setup.</p>
              <div style="margin: 32px 0;">
                <a href="${setupUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                  Set Up Account
                </a>
              </div>
              <p style="color: #64748b; font-size: 14px;">This link will expire in 30 days.</p>
              <p style="color: #64748b; font-size: 14px;">If you didn't expect this email, you can safely ignore it.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
              <p style="color: #94a3b8; font-size: 12px;">SleepDiary - CBT-I Therapy Management</p>
            </div>
          `,
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
