#!/usr/bin/env npx tsx
// Test data seeding script for Sleep Diary
//
// Prerequisites:
// 1. Have a confirmed user account (patient) in Supabase
// 2. Set TEST_EMAIL and TEST_PASSWORD below
//
// Run with: npx tsx scripts/seed-test-data.ts

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?/)
  if (match) {
    envVars[match[1]] = match[2].replace(/\\n/g, '').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// ========================================
// CONFIGURE THESE FOR YOUR TEST USER
// ========================================
const TEST_EMAIL = process.argv[2] || 'testtherapist2025@gmail.com'
const TEST_PASSWORD = process.argv[3] || 'testpassword123'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seedTestData() {
  console.log('='.repeat(50))
  console.log('Sleep Diary Test Data Seeder')
  console.log('='.repeat(50))
  console.log('\nSupabase URL:', supabaseUrl)
  console.log('Test Email:', TEST_EMAIL)

  // Step 1: Sign in
  console.log('\n1. Signing in...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message)
    console.log('\nPossible issues:')
    console.log('  - Email not confirmed (check Supabase Dashboard)')
    console.log('  - Wrong password')
    console.log('  - User does not exist')
    console.log('\nTo fix email confirmation:')
    console.log('  1. Go to: https://supabase.com/dashboard/project/eiunmzzehysyrdacpzkz')
    console.log('  2. Navigate to Authentication > Users')
    console.log('  3. Find the user and click "Confirm email"')
    console.log('\nAlternatively, disable email confirmation:')
    console.log('  1. Go to Authentication > Settings')
    console.log('  2. Turn off "Enable email confirmations"')
    return
  }

  console.log('✅ Signed in successfully!')
  const user = signInData.user
  console.log('   User ID:', user.id)
  console.log('   Email:', user.email)

  // Step 2: Check user role
  console.log('\n2. Checking user role...')

  const { data: patient } = await supabase
    .from('patients')
    .select('*, therapists(name)')
    .eq('id', user.id)
    .single()

  const { data: therapist } = await supabase
    .from('therapists')
    .select('*')
    .eq('id', user.id)
    .single()

  if (therapist && !patient) {
    console.log('✅ User is a THERAPIST:', therapist.name)
    console.log('\n   To test the diary, you need to:')
    console.log('   1. Invite a patient using /therapist/patients/invite')
    console.log('   2. Sign up as that patient')
    console.log('   3. Run this script again with the patient credentials')

    // Create an invitation
    console.log('\n3. Creating a test patient invitation...')
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        therapist_id: user.id,
        email: 'testpatient2025@gmail.com',
        name: 'Test Patient'
      })
      .select()
      .single()

    if (inviteError) {
      if (inviteError.code === '23505') {
        console.log('   Invitation already exists for this email')
        // Get existing invitation
        const { data: existingInvite } = await supabase
          .from('invitations')
          .select('token')
          .eq('email', 'testpatient2025@gmail.com')
          .single()
        if (existingInvite) {
          console.log('\n   ➜ Patient signup URL:')
          console.log(`     http://localhost:3001/invite?token=${existingInvite.token}`)
        }
      } else {
        console.log('   Error creating invitation:', inviteError.message)
      }
    } else {
      console.log('✅ Invitation created!')
      console.log('\n   ➜ Patient signup URL:')
      console.log(`     http://localhost:3001/invite?token=${invitation.token}`)
    }

    console.log('\n   After signing up as patient, run:')
    console.log('   npx tsx scripts/seed-test-data.ts testpatient2025@gmail.com <password>')
    return
  }

  if (patient) {
    console.log('✅ User is a PATIENT:', patient.name)
    console.log('   Status:', patient.status)
    if (patient.therapists) {
      console.log('   Therapist:', (patient.therapists as { name: string }).name)
    }
  } else {
    console.log('❌ User is neither a patient nor therapist')
    console.log('   This might be a fresh account that needs to complete signup')
    return
  }

  // Step 3: Generate test diary entries
  console.log('\n3. Generating test diary entries...')

  const today = new Date()
  const entries = []

  // Create entries for the past 7 days
  for (let i = 1; i <= 7; i++) {
    const sleepDate = new Date(today)
    sleepDate.setDate(today.getDate() - i)
    const dateStr = sleepDate.toISOString().split('T')[0]

    // Generate realistic sleep patterns
    const bedHour = 22 + Math.floor(Math.random() * 2) // 22:00 - 23:59
    const bedMinute = Math.floor(Math.random() * 12) * 5 // 0-55 in 5 min increments

    const ttb = new Date(sleepDate)
    ttb.setHours(bedHour, bedMinute, 0, 0)

    const tts = new Date(ttb)
    tts.setMinutes(tts.getMinutes() + 10 + Math.floor(Math.random() * 15)) // 10-25 min after bed

    const wakeHour = 6 + Math.floor(Math.random() * 2) // 6:00 - 7:59
    const wakeMinute = Math.floor(Math.random() * 12) * 5

    const tfa = new Date(sleepDate)
    tfa.setDate(tfa.getDate() + 1) // Next day
    tfa.setHours(wakeHour, wakeMinute, 0, 0)

    const tob = new Date(tfa)
    tob.setMinutes(tob.getMinutes() + 5 + Math.floor(Math.random() * 10)) // 5-15 min after wake

    // Sleep metrics with realistic variation
    const sol = 10 + Math.floor(Math.random() * 20) // 10-30 min to fall asleep
    const awakenings = Math.floor(Math.random() * 4) // 0-3 awakenings
    const waso = awakenings > 0 ? 15 + Math.floor(Math.random() * 30) : 0 // 15-45 min if awake
    const ema = Math.random() > 0.7 ? 10 + Math.floor(Math.random() * 20) : 0 // 30% chance of early wake

    entries.push({
      patient_id: user.id,
      date: dateStr,
      ttb: ttb.toISOString(),
      tts: tts.toISOString(),
      tfa: tfa.toISOString(),
      tob: tob.toISOString(),
      sol,
      sol_out_of_bed: Math.floor(sol * 0.2), // 20% of SOL out of bed
      awakenings,
      waso,
      waso_out_of_bed: Math.floor(waso * 0.15), // 15% of WASO out of bed
      ema,
      ema_out_of_bed: 0,
      quality_rating: 2 + Math.floor(Math.random() * 3), // 2-4 rating
      answers: {
        q1_ttb: `${bedHour.toString().padStart(2, '0')}:${bedMinute.toString().padStart(2, '0')}`,
        q2_tts: `${tts.getHours().toString().padStart(2, '0')}:${tts.getMinutes().toString().padStart(2, '0')}`,
        q3_fell_asleep_quickly: sol <= 10,
        q4_sol: sol > 10 ? sol : undefined,
        q6_awakenings: awakenings > 0 ? Math.min(awakenings, 6) : 0,
        q7_waso: waso > 0 ? waso : undefined,
        q9_tfa: `${wakeHour.toString().padStart(2, '0')}:${wakeMinute.toString().padStart(2, '0')}`,
        q10_woke_early: ema > 0,
        q11_ema: ema > 0 ? ema : undefined,
        q13_tob: `${tob.getHours().toString().padStart(2, '0')}:${tob.getMinutes().toString().padStart(2, '0')}`,
        q14_quality: 2 + Math.floor(Math.random() * 3)
      }
    })
  }

  // Insert or update entries
  let successCount = 0
  let skipCount = 0

  for (const entry of entries) {
    // Check if entry exists
    const { data: existing } = await supabase
      .from('diary_entries')
      .select('id')
      .eq('patient_id', entry.patient_id)
      .eq('date', entry.date)
      .single()

    if (existing) {
      console.log(`   ${entry.date}: Skipped (already exists)`)
      skipCount++
      continue
    }

    const { error: insertError } = await supabase
      .from('diary_entries')
      .insert(entry)

    if (insertError) {
      console.log(`   ${entry.date}: ❌ Error - ${insertError.message}`)
    } else {
      console.log(`   ${entry.date}: ✅ Created`)
      successCount++
    }
  }

  console.log(`\n   Created: ${successCount}, Skipped: ${skipCount}`)

  // Step 4: Verify and display results
  console.log('\n4. Verifying entries...')
  const { data: savedEntries, error: fetchError } = await supabase
    .from('diary_entries')
    .select('date, tst, tib, twt, se, quality_rating')
    .eq('patient_id', user.id)
    .order('date', { ascending: false })
    .limit(7)

  if (fetchError) {
    console.error('   Fetch error:', fetchError.message)
  } else if (savedEntries && savedEntries.length > 0) {
    console.log('\n   Recent diary entries:')
    console.log('   ' + '-'.repeat(55))
    console.log('   Date       | TST    | TIB    | TWT   | SE%  | Quality')
    console.log('   ' + '-'.repeat(55))
    savedEntries.forEach(e => {
      const tst = e.tst ? `${Math.floor(e.tst / 60)}h${(e.tst % 60).toString().padStart(2, '0')}m` : '--'
      const tib = e.tib ? `${Math.floor(e.tib / 60)}h${(e.tib % 60).toString().padStart(2, '0')}m` : '--'
      const twt = e.twt ? `${e.twt}m`.padStart(4) : '--'
      const se = e.se ? `${Math.round(e.se)}%`.padStart(4) : '--'
      const quality = e.quality_rating ? ['😫', '😴', '😐', '😊', '🌟'][e.quality_rating - 1] : '-'
      console.log(`   ${e.date} | ${tst.padStart(6)} | ${tib.padStart(6)} | ${twt.padStart(5)} | ${se.padStart(4)} | ${quality}`)
    })
    console.log('   ' + '-'.repeat(55))
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Done! Test the diary at:')
  console.log('   http://localhost:3001/patient/diary')
  console.log('   http://localhost:3001/patient/diary/new')
  console.log('='.repeat(50))
}

seedTestData().catch(console.error)
