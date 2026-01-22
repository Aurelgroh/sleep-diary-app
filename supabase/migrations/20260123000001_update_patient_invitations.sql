-- Add single-use tracking to invitations table
-- This allows us to track when invitations are used and by whom

-- Add columns for single-use tracking
ALTER TABLE invitations ADD COLUMN used_at TIMESTAMPTZ;
ALTER TABLE invitations ADD COLUMN used_by UUID REFERENCES auth.users(id);

-- Add index for checking used status
CREATE INDEX idx_invitations_used_at ON invitations(used_at) WHERE used_at IS NULL;
