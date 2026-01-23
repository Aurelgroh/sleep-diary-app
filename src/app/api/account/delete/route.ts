import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// This API handles account deletion with cascading data removal
// Uses service role to delete auth user and all related data
// CRITICAL: Stops on first error to prevent partial deletion

export async function DELETE(request: NextRequest) {
  try {
    // CSRF Protection: Verify request origin
    const origin = request.headers.get('origin')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sleep-diary-app.vercel.app'
    const allowedOrigins = [
      appUrl,
      'http://localhost:3000',
      'http://localhost:3001',
    ]

    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      console.error('CSRF: Invalid origin for account deletion:', origin)
      return NextResponse.json(
        { error: 'Request origin not allowed' },
        { status: 403 }
      )
    }

    const { user_id, user_type } = await request.json()

    if (!user_id || !user_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['patient', 'therapist'].includes(user_type)) {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      )
    }

    // Verify the request is from the authenticated user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized - can only delete your own account' },
        { status: 401 }
      )
    }

    // Create admin Supabase client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log(`Starting deletion of ${user_type} account:`, user_id)

    // Track deletion progress for logging
    const deletedTables: string[] = []

    if (user_type === 'patient') {
      // Delete patient-related data in order (respecting foreign keys)
      // CRITICAL: Stop on first error to prevent partial deletion

      // 1. Delete messages
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('patient_id', user_id)
      if (messagesError) {
        console.error('Error deleting messages:', messagesError)
        return NextResponse.json(
          { error: 'Failed to delete messages. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('messages')

      // 2. Delete diary entries
      const { error: diaryError } = await supabaseAdmin
        .from('diary_entries')
        .delete()
        .eq('patient_id', user_id)
      if (diaryError) {
        console.error('Error deleting diary entries:', diaryError)
        return NextResponse.json(
          { error: 'Failed to delete diary entries. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('diary_entries')

      // 3. Delete ISI scores
      const { error: isiError } = await supabaseAdmin
        .from('isi_scores')
        .delete()
        .eq('patient_id', user_id)
      if (isiError) {
        console.error('Error deleting ISI scores:', isiError)
        return NextResponse.json(
          { error: 'Failed to delete ISI scores. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('isi_scores')

      // 4. Delete sessions
      const { error: sessionsError } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('patient_id', user_id)
      if (sessionsError) {
        console.error('Error deleting sessions:', sessionsError)
        return NextResponse.json(
          { error: 'Failed to delete sessions. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('sessions')

      // 5. Delete prescriptions
      const { error: prescriptionsError } = await supabaseAdmin
        .from('prescriptions')
        .delete()
        .eq('patient_id', user_id)
      if (prescriptionsError) {
        console.error('Error deleting prescriptions:', prescriptionsError)
        return NextResponse.json(
          { error: 'Failed to delete prescriptions. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('prescriptions')

      // 6. Delete invitations (if any were associated)
      const { error: invitationsError } = await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('used_by', user_id)
      if (invitationsError) {
        console.error('Error deleting invitations:', invitationsError)
        return NextResponse.json(
          { error: 'Failed to delete invitations. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('invitations')

      // 7. Delete patient record
      const { error: patientError } = await supabaseAdmin
        .from('patients')
        .delete()
        .eq('id', user_id)
      if (patientError) {
        console.error('Error deleting patient:', patientError)
        return NextResponse.json(
          { error: 'Failed to delete patient record. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('patients')

    } else if (user_type === 'therapist') {
      // Delete therapist-related data
      // Note: We archive patients rather than deleting them

      // 1. Delete messages sent by therapist
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('sender_id', user_id)
        .eq('sender_type', 'therapist')
      if (messagesError) {
        console.error('Error deleting therapist messages:', messagesError)
        return NextResponse.json(
          { error: 'Failed to delete messages. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('messages')

      // 2. Delete sessions created by therapist
      const { error: sessionsError } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('therapist_id', user_id)
      if (sessionsError) {
        console.error('Error deleting sessions:', sessionsError)
        return NextResponse.json(
          { error: 'Failed to delete sessions. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('sessions')

      // 3. Delete prescriptions created by therapist
      const { error: prescriptionsError } = await supabaseAdmin
        .from('prescriptions')
        .delete()
        .eq('created_by', user_id)
      if (prescriptionsError) {
        console.error('Error deleting prescriptions:', prescriptionsError)
        return NextResponse.json(
          { error: 'Failed to delete prescriptions. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('prescriptions')

      // 4. Delete pending invitations
      const { error: invitationsError } = await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('therapist_id', user_id)
      if (invitationsError) {
        console.error('Error deleting invitations:', invitationsError)
        return NextResponse.json(
          { error: 'Failed to delete invitations. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('invitations')

      // 5. Archive patients (don't delete their data)
      const { error: patientsError } = await supabaseAdmin
        .from('patients')
        .update({ status: 'archived', therapist_id: null })
        .eq('therapist_id', user_id)
      if (patientsError) {
        console.error('Error archiving patients:', patientsError)
        return NextResponse.json(
          { error: 'Failed to archive patients. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('patients (archived)')

      // 6. Delete therapist record
      const { error: therapistError } = await supabaseAdmin
        .from('therapists')
        .delete()
        .eq('id', user_id)
      if (therapistError) {
        console.error('Error deleting therapist:', therapistError)
        return NextResponse.json(
          { error: 'Failed to delete therapist record. Account deletion aborted.', deletedTables },
          { status: 500 }
        )
      }
      deletedTables.push('therapists')
    }

    // Finally, delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to delete authentication account. Data was deleted but login remains.', deletedTables },
        { status: 500 }
      )
    }

    console.log(`Successfully deleted ${user_type} account:`, user_id, 'Tables:', deletedTables)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
