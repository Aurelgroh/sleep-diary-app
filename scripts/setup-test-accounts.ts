#!/usr/bin/env npx tsx
/**
 * Setup test accounts and data for Sleep Diary App
 *
 * This script creates:
 * 1. A test therapist account
 * 2. A test patient account linked to the therapist
 * 3. 14 days of mock diary data for the patient
 * 4. A sample prescription
 *
 * Run with: npx tsx scripts/setup-test-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env.local
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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test account credentials
const TEST_THERAPIST = {
  email: 'therapist@sleeptest.com',
  password: 'TestPass123!',
  name: 'Dr. Sarah Thompson',
  credentials: 'PhD, CBTI-certified'
}

const TEST_PATIENT = {
  email: 'patient@sleeptest.com',
  password: 'TestPass123!',
  name: 'John Smith'
}

async function createTherapist() {
  console.log('\n📋 Creating therapist account...')

  // Try to sign in first (account might exist)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_THERAPIST.email,
    password: TEST_THERAPIST.password
  })

  if (signInData?.user) {
    console.log('   ✅ Therapist already exists, signed in!')
    return signInData.user.id
  }

  // Create new account
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_THERAPIST.email,
    password: TEST_THERAPIST.password,
    options: {
      data: {
        name: TEST_THERAPIST.name,
        role: 'therapist'
      }
    }
  })

  if (signUpError) {
    if (signUpError.message.includes('not confirmed')) {
      console.log('   ⚠️  Account exists but email not confirmed')
      console.log('   📝 Please confirm email in Supabase Dashboard:')
      console.log('      https://supabase.com/dashboard/project/eiunmzzehysyrdacpzkz/auth/users')
      return null
    }
    console.error('   ❌ Signup error:', signUpError.message)
    return null
  }

  if (!signUpData.user) {
    console.log('   ⚠️  No user returned - email confirmation may be required')
    return null
  }

  console.log('   ✅ Therapist account created!')
  console.log('   📧 User ID:', signUpData.user.id)

  // Create therapist record
  const { error: therapistError } = await supabase
    .from('therapists')
    .upsert({
      id: signUpData.user.id,
      name: TEST_THERAPIST.name,
      email: TEST_THERAPIST.email,
      credentials: TEST_THERAPIST.credentials
    })

  if (therapistError) {
    console.log('   ⚠️  Therapist record error:', therapistError.message)
  } else {
    console.log('   ✅ Therapist profile created!')
  }

  return signUpData.user.id
}

async function createPatient(therapistId: string | null) {
  console.log('\n👤 Creating patient account...')

  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_PATIENT.email,
    password: TEST_PATIENT.password
  })

  if (signInData?.user) {
    console.log('   ✅ Patient already exists, signed in!')

    // Update therapist link if needed
    if (therapistId) {
      await supabase
        .from('patients')
        .update({ therapist_id: therapistId })
        .eq('id', signInData.user.id)
    }

    return signInData.user.id
  }

  // Create new account
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_PATIENT.email,
    password: TEST_PATIENT.password,
    options: {
      data: {
        name: TEST_PATIENT.name,
        role: 'patient'
      }
    }
  })

  if (signUpError) {
    if (signUpError.message.includes('not confirmed')) {
      console.log('   ⚠️  Account exists but email not confirmed')
      return null
    }
    console.error('   ❌ Signup error:', signUpError.message)
    return null
  }

  if (!signUpData.user) {
    console.log('   ⚠️  No user returned - email confirmation may be required')
    return null
  }

  console.log('   ✅ Patient account created!')
  console.log('   📧 User ID:', signUpData.user.id)

  // Create patient record
  const { error: patientError } = await supabase
    .from('patients')
    .upsert({
      id: signUpData.user.id,
      name: TEST_PATIENT.name,
      email: TEST_PATIENT.email,
      therapist_id: therapistId,
      status: 'active',
      current_session: 1
    })

  if (patientError) {
    console.log('   ⚠️  Patient record error:', patientError.message)
  } else {
    console.log('   ✅ Patient profile created!')
  }

  return signUpData.user.id
}

async function seedDiaryData(patientId: string) {
  console.log('\n📝 Seeding diary entries (14 days)...')

  const today = new Date()
  let created = 0
  let skipped = 0

  for (let i = 1; i <= 14; i++) {
    const entryDate = new Date(today)
    entryDate.setDate(today.getDate() - i)
    const dateStr = entryDate.toISOString().split('T')[0]

    // Check if exists
    const { data: existing } = await supabase
      .from('diary_entries')
      .select('id')
      .eq('patient_id', patientId)
      .eq('date', dateStr)
      .single()

    if (existing) {
      skipped++
      continue
    }

    // Generate realistic sleep data with variation
    const baseQuality = i <= 7 ? 0.88 : 0.82 // Better recent sleep
    const seVariation = (Math.random() - 0.5) * 0.15
    const targetSE = Math.min(0.98, Math.max(0.75, baseQuality + seVariation))

    const bedHour = 22 + Math.floor(Math.random() * 2)
    const bedMin = Math.floor(Math.random() * 12) * 5

    const ttb = new Date(entryDate)
    ttb.setHours(bedHour, bedMin, 0, 0)

    const tts = new Date(ttb)
    tts.setMinutes(tts.getMinutes() + 5 + Math.floor(Math.random() * 15))

    const wakeHour = 6 + Math.floor(Math.random() * 2)
    const wakeMin = Math.floor(Math.random() * 12) * 5

    const tfa = new Date(entryDate)
    tfa.setDate(tfa.getDate() + 1)
    tfa.setHours(wakeHour, wakeMin, 0, 0)

    const tob = new Date(tfa)
    tob.setMinutes(tob.getMinutes() + 5 + Math.floor(Math.random() * 15))

    // Calculate TIB
    const tibMinutes = Math.round((tfa.getTime() - tts.getTime()) / 60000)

    // Calculate wake time to achieve target SE
    const targetTST = Math.round(tibMinutes * targetSE)
    const totalWakeTime = tibMinutes - targetTST

    // Distribute wake time across SOL, WASO, EMA
    const sol = 5 + Math.floor(Math.random() * 20)
    const awakenings = Math.floor(Math.random() * 4)
    const waso = awakenings > 0 ? Math.max(0, Math.floor((totalWakeTime - sol) * 0.7)) : 0
    const ema = Math.max(0, totalWakeTime - sol - waso)

    const qualityRating = targetSE >= 0.9 ? 4 : targetSE >= 0.85 ? 3 : 2

    const { error } = await supabase
      .from('diary_entries')
      .insert({
        patient_id: patientId,
        date: dateStr,
        ttb: ttb.toISOString(),
        tts: tts.toISOString(),
        tfa: tfa.toISOString(),
        tob: tob.toISOString(),
        sol,
        sol_out_of_bed: Math.floor(sol * 0.1),
        awakenings,
        waso,
        waso_out_of_bed: Math.floor(waso * 0.1),
        ema,
        ema_out_of_bed: 0,
        quality_rating: qualityRating,
        answers: { seeded: true, targetSE: Math.round(targetSE * 100) }
      })

    if (error) {
      console.log(`   ❌ ${dateStr}: ${error.message}`)
    } else {
      created++
    }
  }

  console.log(`   ✅ Created: ${created}, Skipped: ${skipped}`)
}

async function createPrescription(patientId: string, therapistId: string) {
  console.log('\n💊 Creating prescription...')

  // Check if prescription exists
  const { data: existing } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('patient_id', patientId)
    .single()

  if (existing) {
    console.log('   ✅ Prescription already exists')
    return
  }

  const { error } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: patientId,
      bedtime: '23:00',
      wake_time: '06:30',
      window_minutes: 450,
      effective_date: new Date().toISOString().split('T')[0],
      created_by: therapistId,
      notes: 'Initial prescription - 7.5 hour sleep window'
    })

  if (error) {
    console.log('   ⚠️  Prescription error:', error.message)
  } else {
    console.log('   ✅ Prescription created (23:00 - 06:30)')
  }
}

async function verifyData(patientId: string) {
  console.log('\n📊 Verifying data...')

  const { data: entries } = await supabase
    .from('diary_entries')
    .select('date, tst, tib, se, quality_rating')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
    .limit(7)

  if (entries && entries.length > 0) {
    console.log('\n   Recent Diary Entries:')
    console.log('   ─────────────────────────────────────────')
    console.log('   Date       │ TST    │ TIB    │ SE%  │ Quality')
    console.log('   ─────────────────────────────────────────')

    entries.forEach(e => {
      const tst = e.tst ? `${Math.floor(e.tst/60)}h${String(e.tst%60).padStart(2,'0')}m` : '----'
      const tib = e.tib ? `${Math.floor(e.tib/60)}h${String(e.tib%60).padStart(2,'0')}m` : '----'
      const se = e.se ? `${Math.round(e.se)}%` : '---'
      const qual = e.quality_rating ? ['😫','😴','😐','😊','🌟'][e.quality_rating-1] : '-'
      console.log(`   ${e.date} │ ${tst.padStart(6)} │ ${tib.padStart(6)} │ ${se.padStart(4)} │ ${qual}`)
    })
    console.log('   ─────────────────────────────────────────')
  }
}

async function main() {
  console.log('═'.repeat(55))
  console.log('  Sleep Diary - Test Account Setup')
  console.log('═'.repeat(55))

  // Step 1: Create therapist
  const therapistId = await createTherapist()

  // Sign out to create patient
  await supabase.auth.signOut()

  // Step 2: Create patient
  const patientId = await createPatient(therapistId)

  if (!patientId) {
    console.log('\n' + '═'.repeat(55))
    console.log('⚠️  Setup incomplete - Email confirmation required')
    console.log('═'.repeat(55))
    console.log('\n📝 To complete setup:')
    console.log('   1. Go to Supabase Dashboard:')
    console.log('      https://supabase.com/dashboard/project/eiunmzzehysyrdacpzkz/auth/users')
    console.log('   2. Find users and click "..." → "Confirm email"')
    console.log('   3. Run this script again')
    console.log('\n   OR disable email confirmation:')
    console.log('   1. Go to Authentication → Providers → Email')
    console.log('   2. Disable "Confirm email"')
    console.log('   3. Run this script again')
    return
  }

  // Step 3: Seed diary data
  await seedDiaryData(patientId)

  // Step 4: Create prescription (need to sign in as therapist)
  if (therapistId) {
    await supabase.auth.signOut()
    const { error } = await supabase.auth.signInWithPassword({
      email: TEST_THERAPIST.email,
      password: TEST_THERAPIST.password
    })
    if (!error) {
      await createPrescription(patientId, therapistId)
    }
  }

  // Step 5: Verify
  await verifyData(patientId)

  // Print credentials
  console.log('\n' + '═'.repeat(55))
  console.log('  ✅ Setup Complete!')
  console.log('═'.repeat(55))
  console.log('\n📋 TEST CREDENTIALS:')
  console.log('─'.repeat(55))
  console.log('\n🩺 THERAPIST:')
  console.log(`   Email:    ${TEST_THERAPIST.email}`)
  console.log(`   Password: ${TEST_THERAPIST.password}`)
  console.log(`   Name:     ${TEST_THERAPIST.name}`)
  console.log('\n👤 PATIENT:')
  console.log(`   Email:    ${TEST_PATIENT.email}`)
  console.log(`   Password: ${TEST_PATIENT.password}`)
  console.log(`   Name:     ${TEST_PATIENT.name}`)
  console.log('\n─'.repeat(55))
  console.log('\n🔗 TEST URLS:')
  console.log('   Home:      http://localhost:3000')
  console.log('   Login:     http://localhost:3000/auth/login')
  console.log('   Patient:   http://localhost:3000/patient')
  console.log('   Therapist: http://localhost:3000/therapist')
  console.log('═'.repeat(55))
}

main().catch(console.error)
