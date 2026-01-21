-- Messages table for therapist-patient communication
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('therapist', 'patient')),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,  -- NULL if unread
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_messages_patient ON messages(patient_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(patient_id, read_at) WHERE read_at IS NULL;

-- RLS Policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Therapists can view and send messages for their patients
CREATE POLICY "Therapists can view messages for their patients"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = messages.patient_id
      AND patients.therapist_id = auth.uid()
    )
  );

CREATE POLICY "Therapists can send messages to their patients"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'therapist' AND
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = messages.patient_id
      AND patients.therapist_id = auth.uid()
    )
  );

-- Patients can view and send their own messages
CREATE POLICY "Patients can view their messages"
  ON messages FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Patients can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'patient' AND
    sender_id = auth.uid() AND
    patient_id = auth.uid()
  );

-- Allow marking messages as read
CREATE POLICY "Therapists can mark messages as read"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = messages.patient_id
      AND patients.therapist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = messages.patient_id
      AND patients.therapist_id = auth.uid()
    )
  );

CREATE POLICY "Patients can mark messages as read"
  ON messages FOR UPDATE
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
