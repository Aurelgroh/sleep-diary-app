-- Add email reminders preference to patients
ALTER TABLE patients ADD COLUMN email_reminders BOOLEAN NOT NULL DEFAULT true;

-- Add index for querying patients with reminders enabled
CREATE INDEX idx_patients_email_reminders ON patients(email_reminders) WHERE email_reminders = true;
