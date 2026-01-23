-- Add reminder_time column to patients (default 9am)
ALTER TABLE patients ADD COLUMN reminder_time TIME NOT NULL DEFAULT '09:00';

-- Index for querying patients by reminder time
CREATE INDEX idx_patients_reminder_time ON patients(reminder_time) WHERE email_reminders = true;
