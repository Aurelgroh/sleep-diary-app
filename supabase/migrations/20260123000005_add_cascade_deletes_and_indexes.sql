-- Migration: Add missing ON DELETE CASCADE constraints and indexes
-- This ensures referential integrity when therapists/patients are deleted

-- First, clean up any orphaned records that would violate constraints
-- (Records referencing non-existent therapists/patients)

-- Clean orphaned prescriptions (created_by references deleted therapist)
DELETE FROM prescriptions
WHERE created_by IS NOT NULL
AND created_by NOT IN (SELECT id FROM therapists);

-- Clean orphaned sessions (therapist_id references deleted therapist)
DELETE FROM sessions
WHERE therapist_id IS NOT NULL
AND therapist_id NOT IN (SELECT id FROM therapists);

-- Clean orphaned sessions (prescription_id references deleted prescription)
UPDATE sessions SET prescription_id = NULL
WHERE prescription_id IS NOT NULL
AND prescription_id NOT IN (SELECT id FROM prescriptions);

-- Now add the missing constraints by dropping and recreating foreign keys

-- prescriptions.created_by -> therapists.id (SET NULL on delete)
ALTER TABLE prescriptions
DROP CONSTRAINT IF EXISTS prescriptions_created_by_fkey;

ALTER TABLE prescriptions
ADD CONSTRAINT prescriptions_created_by_fkey
FOREIGN KEY (created_by) REFERENCES therapists(id) ON DELETE SET NULL;

-- sessions.therapist_id -> therapists.id (SET NULL on delete)
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_therapist_id_fkey;

ALTER TABLE sessions
ADD CONSTRAINT sessions_therapist_id_fkey
FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE SET NULL;

-- sessions.prescription_id -> prescriptions.id (SET NULL on delete)
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_prescription_id_fkey;

ALTER TABLE sessions
ADD CONSTRAINT sessions_prescription_id_fkey
FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL;

-- Add missing indexes for common queries

-- Index on sessions.therapist_id for therapist dashboard
CREATE INDEX IF NOT EXISTS idx_sessions_therapist_id ON sessions(therapist_id);

-- Index on prescriptions.created_by for therapist queries
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_by ON prescriptions(created_by);

-- Composite index on messages for chat queries
CREATE INDEX IF NOT EXISTS idx_messages_patient_sender ON messages(patient_id, sender_type, created_at DESC);

-- Index on diary_entries for date range queries
CREATE INDEX IF NOT EXISTS idx_diary_entries_patient_date ON diary_entries(patient_id, date DESC);
