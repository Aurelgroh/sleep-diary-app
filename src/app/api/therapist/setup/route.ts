import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// This API handles therapist account setup after signup
// Uses service role to bypass RLS for inserting therapist record

export async function POST(request: NextRequest) {
  try {
    const { user_id, email, name, credentials, invite_id } = await request.json()

    if (!user_id || !email || !name || !invite_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create admin Supabase client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the invite exists and matches
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('therapist_invites')
      .select('id, email, setup_token_expires_at')
      .eq('id', invite_id)
      .eq('email', email)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (invite.setup_token_expires_at && new Date(invite.setup_token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation link has expired. Please contact the administrator for a new link.' },
        { status: 400 }
      )
    }

    // Check if therapist already exists
    const { data: existing } = await supabaseAdmin
      .from('therapists')
      .select('id')
      .eq('id', user_id)
      .single()

    if (existing) {
      // Already exists, just clean up invite
      await supabaseAdmin
        .from('therapist_invites')
        .delete()
        .eq('id', invite_id)

      return NextResponse.json({ success: true, message: 'Therapist already exists' })
    }

    // Create the therapist record
    const { error: insertError } = await supabaseAdmin
      .from('therapists')
      .insert({
        id: user_id,
        email,
        name,
        credentials,
        status: 'active',
        activated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to create therapist:', insertError)
      return NextResponse.json(
        { error: 'Failed to create therapist record' },
        { status: 500 }
      )
    }

    // Delete the invite
    await supabaseAdmin
      .from('therapist_invites')
      .delete()
      .eq('id', invite_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
