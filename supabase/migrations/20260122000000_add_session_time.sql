-- Add scheduled_time column to sessions table
ALTER TABLE sessions ADD COLUMN scheduled_time TIME;

-- Add a 'completed' flag to distinguish past from completed sessions
ALTER TABLE sessions ADD COLUMN completed_at TIMESTAMPTZ;
