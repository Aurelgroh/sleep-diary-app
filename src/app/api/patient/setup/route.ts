import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// This API handles patient account setup after signup
// Uses service role to bypass RLS for inserting patient record

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, email, name, therapist_id, invitation_id } = body

    console.log('Patient setup API called with:', { user_id, email, name, therapist_id, invitation_id })

    if (!user_id || !email || !name || !therapist_id || !invitation_id) {
      console.error('Missing required fields:', { user_id: !!user_id, email: !!email, name: !!name, therapist_id: !!therapist_id, invitation_id: !!invitation_id })
      return NextResponse.json(
        { error: `Missing required fields: ${!user_id ? 'user_id ' : ''}${!email ? 'email ' : ''}${!name ? 'name ' : ''}${!therapist_id ? 'therapist_id ' : ''}${!invitation_id ? 'invitation_id' : ''}`.trim() },
        { status: 400 }
      )
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create admin Supabase client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the invitation exists and matches
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('id, email, therapist_id, used_at')
      .eq('id', invitation_id)
      .eq('email', email)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 400 }
      )
    }

    if (invitation.used_at) {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      )
    }

    // Check if patient already exists
    const { data: existing } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('id', user_id)
      .single()

    if (existing) {
      // Already exists, just clean up invitation
      await supabaseAdmin
        .from('invitations')
        .update({ used_at: new Date().toISOString(), used_by: user_id })
        .eq('id', invitation_id)

      return NextResponse.json({ success: true, message: 'Patient already exists' })
    }

    // Create the patient record
    const { error: insertError } = await supabaseAdmin
      .from('patients')
      .insert({
        id: user_id,
        email,
        name,
        therapist_id,
        status: 'baseline',
      })

    if (insertError) {
      console.error('Failed to create patient:', insertError)
      return NextResponse.json(
        { error: 'Failed to create patient record' },
        { status: 500 }
      )
    }

    // Mark invitation as used
    await supabaseAdmin
      .from('invitations')
      .update({ used_at: new Date().toISOString(), used_by: user_id })
      .eq('id', invitation_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Patient setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
