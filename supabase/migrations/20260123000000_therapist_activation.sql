-- Add therapist status tracking and setup tokens
-- This enables admin-created therapists with activation flow

-- Add therapist status enum
CREATE TYPE therapist_status AS ENUM ('pending', 'active', 'suspended');

-- Add columns to therapists for activation flow
ALTER TABLE therapists ADD COLUMN status therapist_status NOT NULL DEFAULT 'active';
ALTER TABLE therapists ADD COLUMN activated_at TIMESTAMPTZ;

-- Update existing therapists to active status with activation timestamp
UPDATE therapists SET activated_at = created_at WHERE activated_at IS NULL;

-- Create a separate table for pending therapist invitations
-- This allows admin to create invites before the therapist has an auth account
CREATE TABLE therapist_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  credentials TEXT,
  setup_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  setup_token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX idx_therapist_invites_setup_token ON therapist_invites(setup_token);
CREATE INDEX idx_therapist_invites_email ON therapist_invites(email);

-- RLS Policies for therapist_invites
ALTER TABLE therapist_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read an invite by token (for registration)
CREATE POLICY "Anyone can read therapist invite by token"
  ON therapist_invites FOR SELECT
  USING (true);

-- Only service role can insert/delete (admin via Supabase Dashboard)
-- No INSERT/UPDATE/DELETE policies for regular users
