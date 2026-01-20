-- Create invitations table for pending patient invitations
-- This is separate from patients table because patients.id must reference auth.users

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index for token lookups
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- RLS Policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Therapists can create and view their own invitations
CREATE POLICY "Therapists can manage their invitations"
  ON invitations FOR ALL
  USING (therapist_id = auth.uid());

-- Anyone can read an invitation by token (for registration)
CREATE POLICY "Anyone can read invitation by token"
  ON invitations FOR SELECT
  USING (true);

-- Remove the invitation_token and invited_at columns from patients
-- since we'll use the invitations table instead
ALTER TABLE patients DROP COLUMN IF EXISTS invitation_token;
ALTER TABLE patients DROP COLUMN IF EXISTS invited_at;

-- Update patients table to allow the therapist to insert patient records
-- The patient ID will be provided after the user registers
-- Remove the 'invited' status since invitations are now separate
-- Actually, keep 'invited' for backwards compatibility but it won't be used
