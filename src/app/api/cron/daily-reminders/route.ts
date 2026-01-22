import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// This API sends daily sleep diary reminder emails
// Should be called by a cron job each morning (e.g., 8am in each timezone)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create admin Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const today = new Date().toISOString().split('T')[0]

    // Get all patients with reminders enabled
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select(`
        id,
        name,
        email,
        status,
        therapists(name)
      `)
      .eq('email_reminders', true)
      .in('status', ['baseline', 'active'])

    if (patientsError) {
      console.error('Error fetching patients:', patientsError)
      return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
    }

    if (!patients || patients.length === 0) {
      return NextResponse.json({ message: 'No patients to remind', sent: 0 })
    }

    // Get today's diary entries to exclude patients who already logged
    const patientIds = patients.map(p => p.id)
    const { data: todayEntries } = await supabase
      .from('diary_entries')
      .select('patient_id')
      .in('patient_id', patientIds)
      .eq('date', today)

    const patientsWhoLogged = new Set(todayEntries?.map(e => e.patient_id) || [])

    // Get current prescriptions for all patients
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select('patient_id, bedtime, wake_time')
      .in('patient_id', patientIds)
      .lte('effective_date', today)
      .order('effective_date', { ascending: false })

    // Create a map of patient_id -> most recent prescription
    const prescriptionMap = new Map<string, { bedtime: string; wake_time: string }>()
    prescriptions?.forEach(p => {
      if (!prescriptionMap.has(p.patient_id)) {
        prescriptionMap.set(p.patient_id, { bedtime: p.bedtime, wake_time: p.wake_time })
      }
    })

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        message: 'No email service configured',
        patientsToRemind: patients.length - patientsWhoLogged.size
      })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sleep-diary-app.vercel.app'
    const emailFrom = process.env.EMAIL_FROM || 'SleepDiary <noreply@auth.patientlearningsystems.com>'

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const patient of patients) {
      // Skip if already logged today
      if (patientsWhoLogged.has(patient.id)) {
        skipped++
        continue
      }

      const prescription = prescriptionMap.get(patient.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const therapistData = patient.therapists as any
      const therapistName = therapistData?.name || 'your therapist'
      const firstName = patient.name.split(' ')[0]

      // Build personalized email
      const emailHtml = buildReminderEmail({
        firstName,
        therapistName,
        prescription,
        appUrl
      })

      try {
        const { error: emailError } = await resend.emails.send({
          from: emailFrom,
          to: patient.email,
          subject: `Good morning, ${firstName}! Time to log your sleep`,
          html: emailHtml
        })

        if (emailError) {
          console.error(`Failed to send to ${patient.email}:`, emailError)
          errors.push(patient.email)
        } else {
          sent++
        }
      } catch (err) {
        console.error(`Error sending to ${patient.email}:`, err)
        errors.push(patient.email)
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      errors: errors.length,
      total: patients.length
    })
  } catch (error) {
    console.error('Daily reminder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildReminderEmail({
  firstName,
  therapistName,
  prescription,
  appUrl
}: {
  firstName: string
  therapistName: string
  prescription?: { bedtime: string; wake_time: string }
  appUrl: string
}): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const prescriptionSection = prescription ? `
    <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="color: #1e40af; font-weight: 600; margin: 0 0 12px 0; font-size: 14px;">YOUR SLEEP SCHEDULE</p>
      <div style="display: flex; justify-content: center; gap: 40px; text-align: center;">
        <div>
          <p style="color: #1e293b; font-size: 24px; font-weight: bold; margin: 0;">${formatTime(prescription.bedtime)}</p>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Bedtime</p>
        </div>
        <div style="color: #cbd5e1; font-size: 24px;">→</div>
        <div>
          <p style="color: #1e293b; font-size: 24px; font-weight: bold; margin: 0;">${formatTime(prescription.wake_time)}</p>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Wake time</p>
        </div>
      </div>
      <p style="color: #475569; font-size: 14px; margin: 16px 0 0 0; text-align: center;">
        Sticking to your sleep window helps build a stronger sleep drive and improves sleep quality over time.
      </p>
    </div>
  ` : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🌅</div>
            <h1 style="color: #1e293b; font-size: 24px; font-weight: 600; margin: 0;">Good morning, ${firstName}!</h1>
          </div>

          <!-- Main message -->
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            This is a gentle reminder to log last night's sleep in your diary.
            Taking a moment to record how you slept helps ${therapistName} understand your progress
            and adjust your sleep plan as needed.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/patient/diary/new" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">
              Log My Sleep
            </a>
          </div>

          <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0 0 24px 0;">
            It only takes about 2 minutes ⏱️
          </p>

          ${prescriptionSection}

          <!-- Tips section -->
          <div style="background-color: #fefce8; border-radius: 12px; padding: 20px; margin-top: 24px;">
            <p style="color: #854d0e; font-weight: 600; margin: 0 0 12px 0; font-size: 14px;">💡 QUICK TIPS FOR TODAY</p>
            <ul style="color: #713f12; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Try to avoid napping during the day (unless needed for safety, like driving)</li>
              <li style="margin-bottom: 8px;">Get some natural light exposure, especially in the morning</li>
              <li>Stay active but avoid intense exercise close to bedtime</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              You're receiving this because you have daily reminders enabled in your
              <a href="${appUrl}/patient/profile" style="color: #64748b;">profile settings</a>.
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `
}
