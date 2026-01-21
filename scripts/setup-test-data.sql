-- ================================================
-- Sleep Diary Test Data Setup Script
-- Run this in Supabase SQL Editor to create test data
-- ================================================

-- First, confirm the test user emails
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email IN ('therapist@sleeptest.com', 'patient@sleeptest.com');

-- Get the user IDs
DO $$
DECLARE
  therapist_uuid UUID;
  patient_uuid UUID;
BEGIN
  -- Get therapist ID
  SELECT id INTO therapist_uuid
  FROM auth.users
  WHERE email = 'therapist@sleeptest.com';

  -- Get patient ID
  SELECT id INTO patient_uuid
  FROM auth.users
  WHERE email = 'patient@sleeptest.com';

  -- Create therapist profile
  INSERT INTO therapists (id, name, email, credentials)
  VALUES (
    therapist_uuid,
    'Dr. Sarah Thompson',
    'therapist@sleeptest.com',
    'PhD, CBTI-certified'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    credentials = EXCLUDED.credentials;

  -- Create patient profile linked to therapist
  INSERT INTO patients (id, name, email, therapist_id, status, current_session)
  VALUES (
    patient_uuid,
    'John Smith',
    'patient@sleeptest.com',
    therapist_uuid,
    'active',
    2
  )
  ON CONFLICT (id) DO UPDATE SET
    therapist_id = therapist_uuid,
    status = 'active',
    current_session = 2;

  -- Create prescription
  INSERT INTO prescriptions (patient_id, bedtime, wake_time, window_minutes, effective_date, created_by, notes)
  VALUES (
    patient_uuid,
    '23:00',
    '06:30',
    450,
    CURRENT_DATE - INTERVAL '7 days',
    therapist_uuid,
    'Initial prescription - 7.5 hour sleep window'
  )
  ON CONFLICT DO NOTHING;

  -- Delete existing diary entries for clean slate
  DELETE FROM diary_entries WHERE patient_id = patient_uuid;

  -- Insert 14 days of diary data
  INSERT INTO diary_entries (
    patient_id, date, ttb, tts, tfa, tob,
    sol, sol_out_of_bed, awakenings, waso, waso_out_of_bed,
    ema, ema_out_of_bed, quality_rating, answers
  )
  VALUES
    -- Day 1 (yesterday) - Good sleep
    (patient_uuid, CURRENT_DATE - 1,
     (CURRENT_DATE - 1 + TIME '22:30')::timestamptz,
     (CURRENT_DATE - 1 + TIME '22:45')::timestamptz,
     (CURRENT_DATE + TIME '06:15')::timestamptz,
     (CURRENT_DATE + TIME '06:25')::timestamptz,
     12, 0, 1, 15, 0, 0, 0, 4, '{"seeded": true}'::jsonb),

    -- Day 2 - Excellent sleep
    (patient_uuid, CURRENT_DATE - 2,
     (CURRENT_DATE - 2 + TIME '23:00')::timestamptz,
     (CURRENT_DATE - 2 + TIME '23:10')::timestamptz,
     (CURRENT_DATE - 1 + TIME '06:30')::timestamptz,
     (CURRENT_DATE - 1 + TIME '06:40')::timestamptz,
     8, 0, 0, 0, 0, 0, 0, 5, '{"seeded": true}'::jsonb),

    -- Day 3 - Good sleep
    (patient_uuid, CURRENT_DATE - 3,
     (CURRENT_DATE - 3 + TIME '22:45')::timestamptz,
     (CURRENT_DATE - 3 + TIME '23:00')::timestamptz,
     (CURRENT_DATE - 2 + TIME '06:20')::timestamptz,
     (CURRENT_DATE - 2 + TIME '06:35')::timestamptz,
     15, 0, 2, 20, 0, 0, 0, 4, '{"seeded": true}'::jsonb),

    -- Day 4 - Average sleep
    (patient_uuid, CURRENT_DATE - 4,
     (CURRENT_DATE - 4 + TIME '23:15')::timestamptz,
     (CURRENT_DATE - 4 + TIME '23:30')::timestamptz,
     (CURRENT_DATE - 3 + TIME '06:45')::timestamptz,
     (CURRENT_DATE - 3 + TIME '07:00')::timestamptz,
     18, 0, 1, 25, 5, 10, 0, 3, '{"seeded": true}'::jsonb),

    -- Day 5 - Good sleep
    (patient_uuid, CURRENT_DATE - 5,
     (CURRENT_DATE - 5 + TIME '22:30')::timestamptz,
     (CURRENT_DATE - 5 + TIME '22:40')::timestamptz,
     (CURRENT_DATE - 4 + TIME '06:10')::timestamptz,
     (CURRENT_DATE - 4 + TIME '06:20')::timestamptz,
     10, 0, 1, 12, 0, 0, 0, 4, '{"seeded": true}'::jsonb),

    -- Day 6 - Excellent sleep
    (patient_uuid, CURRENT_DATE - 6,
     (CURRENT_DATE - 6 + TIME '23:00')::timestamptz,
     (CURRENT_DATE - 6 + TIME '23:05')::timestamptz,
     (CURRENT_DATE - 5 + TIME '06:35')::timestamptz,
     (CURRENT_DATE - 5 + TIME '06:45')::timestamptz,
     5, 0, 0, 0, 0, 0, 0, 5, '{"seeded": true}'::jsonb),

    -- Day 7 - Good sleep
    (patient_uuid, CURRENT_DATE - 7,
     (CURRENT_DATE - 7 + TIME '22:45')::timestamptz,
     (CURRENT_DATE - 7 + TIME '23:00')::timestamptz,
     (CURRENT_DATE - 6 + TIME '06:25')::timestamptz,
     (CURRENT_DATE - 6 + TIME '06:40')::timestamptz,
     14, 0, 1, 18, 0, 0, 0, 4, '{"seeded": true}'::jsonb),

    -- Day 8 (last week) - Average
    (patient_uuid, CURRENT_DATE - 8,
     (CURRENT_DATE - 8 + TIME '23:30')::timestamptz,
     (CURRENT_DATE - 8 + TIME '23:50')::timestamptz,
     (CURRENT_DATE - 7 + TIME '07:00')::timestamptz,
     (CURRENT_DATE - 7 + TIME '07:15')::timestamptz,
     22, 5, 2, 30, 5, 15, 0, 3, '{"seeded": true}'::jsonb),

    -- Day 9 - Poor sleep
    (patient_uuid, CURRENT_DATE - 9,
     (CURRENT_DATE - 9 + TIME '22:00')::timestamptz,
     (CURRENT_DATE - 9 + TIME '22:30')::timestamptz,
     (CURRENT_DATE - 8 + TIME '05:30')::timestamptz,
     (CURRENT_DATE - 8 + TIME '06:00')::timestamptz,
     30, 10, 3, 45, 10, 30, 5, 2, '{"seeded": true}'::jsonb),

    -- Day 10 - Average
    (patient_uuid, CURRENT_DATE - 10,
     (CURRENT_DATE - 10 + TIME '23:00')::timestamptz,
     (CURRENT_DATE - 10 + TIME '23:20')::timestamptz,
     (CURRENT_DATE - 9 + TIME '06:30')::timestamptz,
     (CURRENT_DATE - 9 + TIME '06:45')::timestamptz,
     20, 0, 2, 25, 0, 10, 0, 3, '{"seeded": true}'::jsonb),

    -- Day 11 - Good
    (patient_uuid, CURRENT_DATE - 11,
     (CURRENT_DATE - 11 + TIME '22:45')::timestamptz,
     (CURRENT_DATE - 11 + TIME '22:55')::timestamptz,
     (CURRENT_DATE - 10 + TIME '06:20')::timestamptz,
     (CURRENT_DATE - 10 + TIME '06:30')::timestamptz,
     12, 0, 1, 15, 0, 0, 0, 4, '{"seeded": true}'::jsonb),

    -- Day 12 - Average
    (patient_uuid, CURRENT_DATE - 12,
     (CURRENT_DATE - 12 + TIME '23:15')::timestamptz,
     (CURRENT_DATE - 12 + TIME '23:35')::timestamptz,
     (CURRENT_DATE - 11 + TIME '06:45')::timestamptz,
     (CURRENT_DATE - 11 + TIME '07:00')::timestamptz,
     18, 0, 2, 22, 0, 8, 0, 3, '{"seeded": true}'::jsonb),

    -- Day 13 - Poor
    (patient_uuid, CURRENT_DATE - 13,
     (CURRENT_DATE - 13 + TIME '22:30')::timestamptz,
     (CURRENT_DATE - 13 + TIME '23:00')::timestamptz,
     (CURRENT_DATE - 12 + TIME '05:45')::timestamptz,
     (CURRENT_DATE - 12 + TIME '06:15')::timestamptz,
     28, 5, 3, 40, 10, 25, 0, 2, '{"seeded": true}'::jsonb),

    -- Day 14 (baseline) - Average
    (patient_uuid, CURRENT_DATE - 14,
     (CURRENT_DATE - 14 + TIME '23:00')::timestamptz,
     (CURRENT_DATE - 14 + TIME '23:25')::timestamptz,
     (CURRENT_DATE - 13 + TIME '06:30')::timestamptz,
     (CURRENT_DATE - 13 + TIME '06:50')::timestamptz,
     20, 0, 2, 28, 5, 12, 0, 3, '{"seeded": true}'::jsonb);

  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Therapist ID: %', therapist_uuid;
  RAISE NOTICE 'Patient ID: %', patient_uuid;
END $$;

-- Verify the setup
SELECT 'Therapist' as role, name, email FROM therapists WHERE email = 'therapist@sleeptest.com'
UNION ALL
SELECT 'Patient' as role, name, email FROM patients WHERE email = 'patient@sleeptest.com';

-- Show diary entries summary
SELECT
  date,
  ROUND(tst / 60.0, 1) as tst_hours,
  ROUND(tib / 60.0, 1) as tib_hours,
  ROUND(se, 0) as se_percent,
  quality_rating
FROM diary_entries
WHERE patient_id = (SELECT id FROM auth.users WHERE email = 'patient@sleeptest.com')
ORDER BY date DESC
LIMIT 7;
