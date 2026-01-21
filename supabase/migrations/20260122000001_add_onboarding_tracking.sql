-- Add onboarding tracking field to patients table
ALTER TABLE patients ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
