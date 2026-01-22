import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// This API handles account deletion with cascading data removal
// Uses service role to delete auth user and all related data

export async function DELETE(request: NextRequest) {
  try {
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

    console.log(`Deleting ${user_type} account:`, user_id)

    if (user_type === 'patient') {
      // Delete patient-related data in order (respecting foreign keys)

      // 1. Delete messages
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('patient_id', user_id)
      if (messagesError) console.error('Error deleting messages:', messagesError)

      // 2. Delete diary entries
      const { error: diaryError } = await supabaseAdmin
        .from('diary_entries')
        .delete()
        .eq('patient_id', user_id)
      if (diaryError) console.error('Error deleting diary entries:', diaryError)

      // 3. Delete ISI scores
      const { error: isiError } = await supabaseAdmin
        .from('isi_scores')
        .delete()
        .eq('patient_id', user_id)
      if (isiError) console.error('Error deleting ISI scores:', isiError)

      // 4. Delete sessions
      const { error: sessionsError } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('patient_id', user_id)
      if (sessionsError) console.error('Error deleting sessions:', sessionsError)

      // 5. Delete prescriptions
      const { error: prescriptionsError } = await supabaseAdmin
        .from('prescriptions')
        .delete()
        .eq('patient_id', user_id)
      if (prescriptionsError) console.error('Error deleting prescriptions:', prescriptionsError)

      // 6. Delete invitations (if any were associated)
      const { error: invitationsError } = await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('used_by', user_id)
      if (invitationsError) console.error('Error deleting invitations:', invitationsError)

      // 7. Delete patient record
      const { error: patientError } = await supabaseAdmin
        .from('patients')
        .delete()
        .eq('id', user_id)
      if (patientError) {
        console.error('Error deleting patient:', patientError)
        return NextResponse.json(
          { error: 'Failed to delete patient record' },
          { status: 500 }
        )
      }

    } else if (user_type === 'therapist') {
      // Delete therapist-related data
      // Note: We don't delete patients - they need to be reassigned

      // 1. Delete messages sent by therapist
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('sender_id', user_id)
        .eq('sender_type', 'therapist')
      if (messagesError) console.error('Error deleting therapist messages:', messagesError)

      // 2. Delete sessions created by therapist
      const { error: sessionsError } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('therapist_id', user_id)
      if (sessionsError) console.error('Error deleting sessions:', sessionsError)

      // 3. Delete prescriptions created by therapist
      const { error: prescriptionsError } = await supabaseAdmin
        .from('prescriptions')
        .delete()
        .eq('created_by', user_id)
      if (prescriptionsError) console.error('Error deleting prescriptions:', prescriptionsError)

      // 4. Delete pending invitations
      const { error: invitationsError } = await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('therapist_id', user_id)
      if (invitationsError) console.error('Error deleting invitations:', invitationsError)

      // 5. Unlink patients (set therapist_id to null or archive them)
      // For now, we'll set their status to 'archived' but keep their data
      const { error: patientsError } = await supabaseAdmin
        .from('patients')
        .update({ status: 'archived' })
        .eq('therapist_id', user_id)
      if (patientsError) console.error('Error archiving patients:', patientsError)

      // 6. Delete therapist record
      const { error: therapistError } = await supabaseAdmin
        .from('therapists')
        .delete()
        .eq('id', user_id)
      if (therapistError) {
        console.error('Error deleting therapist:', therapistError)
        return NextResponse.json(
          { error: 'Failed to delete therapist record' },
          { status: 500 }
        )
      }
    }

    // Finally, delete the auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authError) {
      console.error('Error deleting auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to delete authentication account' },
        { status: 500 }
      )
    }

    console.log(`Successfully deleted ${user_type} account:`, user_id)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
