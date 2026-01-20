-- Add INSERT policy for therapists table
-- Allows users to create their own therapist profile

CREATE POLICY "Users can create their own therapist profile"
  ON therapists FOR INSERT
  WITH CHECK (auth.uid() = id);
