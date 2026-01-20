-- SleepDiary Initial Schema
-- Based on PRD v1.1

-- Enable pgcrypto for gen_random_uuid() if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE patient_status AS ENUM (
  'invited',      -- Invitation sent, not yet registered
  'baseline',     -- Registered, collecting baseline data
  'active',       -- In treatment (sessions 1-6)
  'completed',    -- Treatment completed
  'archived'      -- Archived by therapist
);

-- ============================================
-- THERAPISTS
-- ============================================

CREATE TABLE therapists (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  credentials TEXT,  -- e.g., "PhD, CBSM"
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for therapists
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can view own profile"
  ON therapists FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Therapists can update own profile"
  ON therapists FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- PATIENTS
-- ============================================

CREATE TABLE patients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE RESTRICT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  status patient_status NOT NULL DEFAULT 'invited',
  current_session INTEGER NOT NULL DEFAULT 0,  -- 0 = baseline, 1-6 = sessions
  baseline_date DATE,  -- Date when baseline was established (5 of 7 days)
  min_sleep_window INTEGER NOT NULL DEFAULT 300,  -- Minimum window in minutes (default 5 hours)
  invitation_token UUID,
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for therapist lookups
CREATE INDEX idx_patients_therapist ON patients(therapist_id);
CREATE INDEX idx_patients_status ON patients(status);

-- RLS Policies for patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can view their patients"
  ON patients FOR SELECT
  USING (
    therapist_id = auth.uid() OR
    id = auth.uid()
  );

CREATE POLICY "Therapists can insert patients"
  ON patients FOR INSERT
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists can update their patients"
  ON patients FOR UPDATE
  USING (therapist_id = auth.uid());

CREATE POLICY "Patients can view own profile"
  ON patients FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Patients can update own profile"
  ON patients FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- PRESCRIPTIONS (Sleep Windows)
-- ============================================

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  bedtime TIME NOT NULL,  -- e.g., '23:30:00'
  wake_time TIME NOT NULL,  -- e.g., '05:00:00'
  window_minutes INTEGER NOT NULL,  -- Computed: minutes between bedtime and wake_time
  effective_date DATE NOT NULL,  -- When this prescription takes effect
  created_by UUID NOT NULL REFERENCES therapists(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for patient lookups
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id, effective_date DESC);

-- RLS Policies for prescriptions
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage prescriptions for their patients"
  ON prescriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.therapist_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their prescriptions"
  ON prescriptions FOR SELECT
  USING (patient_id = auth.uid());

-- ============================================
-- DIARY ENTRIES
-- ============================================

CREATE TABLE diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,  -- The night being logged (sleep date)

  -- Core sleep times
  ttb TIMESTAMPTZ NOT NULL,  -- Time to Bed
  tts TIMESTAMPTZ NOT NULL,  -- Time to Sleep (tried to fall asleep)
  tfa TIMESTAMPTZ NOT NULL,  -- Time of Final Awakening
  tob TIMESTAMPTZ NOT NULL,  -- Time Out of Bed

  -- Sleep latency and awakenings
  sol INTEGER NOT NULL DEFAULT 0,  -- Sleep Onset Latency (minutes)
  sol_out_of_bed INTEGER NOT NULL DEFAULT 0,  -- SOL time spent out of bed (stimulus control)
  awakenings INTEGER NOT NULL DEFAULT 0,  -- Number of awakenings
  waso INTEGER NOT NULL DEFAULT 0,  -- Wake After Sleep Onset (minutes)
  waso_out_of_bed INTEGER NOT NULL DEFAULT 0,  -- WASO time spent out of bed (stimulus control)
  ema INTEGER NOT NULL DEFAULT 0,  -- Early Morning Awakening (minutes woke before desired)
  ema_out_of_bed INTEGER NOT NULL DEFAULT 0,  -- EMA time spent out of bed (stimulus control)

  -- Computed fields (stored for performance)
  tib INTEGER,  -- Time in Bed (minutes)
  twt INTEGER,  -- Total Wake Time (minutes) = sol + waso + ema
  twt_out INTEGER,  -- Total Wake Time Out of Bed (minutes) = sol_out + waso_out + ema_out
  tst INTEGER,  -- Total Sleep Time (minutes) = tib - twt
  se DECIMAL(5,2),  -- Sleep Efficiency (%) = (tst / tib) * 100

  -- Adherence tracking (compared to active prescription)
  prescribed_bedtime TIME,  -- Snapshot of prescription at time of entry
  prescribed_wake_time TIME,
  bedtime_deviation INTEGER,  -- Minutes from prescribed (negative = early, positive = late)
  waketime_deviation INTEGER,

  -- Subjective measures
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  notes TEXT,

  -- Raw quiz answers for audit
  answers JSONB,

  -- Metadata
  entered_by UUID,  -- NULL if patient, therapist_id if manual entry
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(patient_id, date)
);

-- Indexes for common queries
CREATE INDEX idx_diary_entries_patient ON diary_entries(patient_id, date DESC);
CREATE INDEX idx_diary_entries_date ON diary_entries(date);

-- RLS Policies for diary_entries
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can manage their diary entries"
  ON diary_entries FOR ALL
  USING (patient_id = auth.uid());

CREATE POLICY "Therapists can view and insert entries for their patients"
  ON diary_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = diary_entries.patient_id
      AND patients.therapist_id = auth.uid()
    )
  );

-- ============================================
-- SESSIONS
-- ============================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES therapists(id),
  session_number INTEGER NOT NULL CHECK (session_number >= 1 AND session_number <= 10),
  date DATE NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id),  -- Prescription set during this session
  notes TEXT,

  -- Titration data snapshot
  titration_data JSONB,
  /*
    {
      "period_start": "2026-01-12",
      "period_end": "2026-01-18",
      "days_logged": 7,
      "avg_tst": 348,
      "avg_tib": 360,
      "avg_se": 96.7,
      "avg_sol": 12,
      "avg_waso": 10,
      "previous_se": 94.0,
      "se_improvement_pct": 2.87,
      "recommendation": "increase",
      "recommendation_minutes": 15,
      "action_taken": "increase",
      "action_minutes": 15
    }
  */

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(patient_id, session_number)
);

-- Index for lookups
CREATE INDEX idx_sessions_patient ON sessions(patient_id, session_number);

-- RLS Policies for sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage sessions for their patients"
  ON sessions FOR ALL
  USING (therapist_id = auth.uid());

CREATE POLICY "Patients can view their sessions"
  ON sessions FOR SELECT
  USING (patient_id = auth.uid());

-- ============================================
-- ISI SCORES (Insomnia Severity Index)
-- ============================================

CREATE TABLE isi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),  -- NULL for intake
  date DATE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 28),
  answers JSONB NOT NULL,  -- Array of 7 answers (0-4 each)
  /*
    [
      {"question": 1, "answer": 3},
      {"question": 2, "answer": 2},
      ...
    ]
  */
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('intake', 'mid_treatment', 'discharge', 'follow_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_isi_scores_patient ON isi_scores(patient_id, date DESC);

-- RLS Policies for isi_scores
ALTER TABLE isi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can manage ISI scores for their patients"
  ON isi_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = isi_scores.patient_id
      AND patients.therapist_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view their ISI scores"
  ON isi_scores FOR SELECT
  USING (patient_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to compute diary entry metrics before insert/update
CREATE OR REPLACE FUNCTION compute_diary_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Time in Bed (minutes)
  NEW.tib := EXTRACT(EPOCH FROM (NEW.tob - NEW.ttb)) / 60;

  -- Total Wake Time (minutes)
  NEW.twt := NEW.sol + NEW.waso + NEW.ema;

  -- Total Wake Time Out of Bed (minutes)
  NEW.twt_out := NEW.sol_out_of_bed + NEW.waso_out_of_bed + NEW.ema_out_of_bed;

  -- Total Sleep Time (minutes)
  NEW.tst := NEW.tib - NEW.twt;

  -- Sleep Efficiency (percentage)
  IF NEW.tib > 0 THEN
    NEW.se := (NEW.tst::DECIMAL / NEW.tib) * 100;
  ELSE
    NEW.se := 0;
  END IF;

  -- Get active prescription for adherence tracking
  SELECT bedtime, wake_time INTO NEW.prescribed_bedtime, NEW.prescribed_wake_time
  FROM prescriptions
  WHERE patient_id = NEW.patient_id
    AND effective_date <= NEW.date
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Calculate deviations if prescription exists
  IF NEW.prescribed_bedtime IS NOT NULL THEN
    NEW.bedtime_deviation := EXTRACT(EPOCH FROM (NEW.ttb::TIME - NEW.prescribed_bedtime)) / 60;
    NEW.waketime_deviation := EXTRACT(EPOCH FROM (NEW.tob::TIME - NEW.prescribed_wake_time)) / 60;
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for diary entry computations
CREATE TRIGGER diary_entry_compute
  BEFORE INSERT OR UPDATE ON diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION compute_diary_metrics();

-- Function to check baseline establishment (5 of 7 consecutive days)
CREATE OR REPLACE FUNCTION check_baseline_establishment(p_patient_id UUID)
RETURNS DATE AS $$
DECLARE
  baseline_date DATE;
  consecutive_count INTEGER;
  check_date DATE;
BEGIN
  -- Look for 5 of 7 consecutive days with diary entries
  FOR check_date IN
    SELECT DISTINCT date
    FROM diary_entries
    WHERE patient_id = p_patient_id
    ORDER BY date DESC
    LIMIT 14
  LOOP
    SELECT COUNT(*) INTO consecutive_count
    FROM diary_entries
    WHERE patient_id = p_patient_id
      AND date BETWEEN check_date - INTERVAL '6 days' AND check_date;

    IF consecutive_count >= 5 THEN
      RETURN check_date;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate weekly averages
CREATE OR REPLACE FUNCTION calculate_weekly_averages(
  p_patient_id UUID,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  avg_tst DECIMAL,
  avg_tib DECIMAL,
  avg_se DECIMAL,
  avg_sol DECIMAL,
  avg_waso DECIMAL,
  avg_ema DECIMAL,
  avg_twt_out DECIMAL,
  days_logged INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(de.tst), 1) as avg_tst,
    ROUND(AVG(de.tib), 1) as avg_tib,
    ROUND(AVG(de.se), 2) as avg_se,
    ROUND(AVG(de.sol), 1) as avg_sol,
    ROUND(AVG(de.waso), 1) as avg_waso,
    ROUND(AVG(de.ema), 1) as avg_ema,
    ROUND(AVG(de.twt_out), 1) as avg_twt_out,
    COUNT(*)::INTEGER as days_logged
  FROM diary_entries de
  WHERE de.patient_id = p_patient_id
    AND de.date BETWEEN p_end_date - INTERVAL '6 days' AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER therapists_updated_at
  BEFORE UPDATE ON therapists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
