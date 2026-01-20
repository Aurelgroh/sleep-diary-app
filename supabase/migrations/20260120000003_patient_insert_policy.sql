-- Allow users to create their own patient profile
-- This is needed when a patient registers via invitation

CREATE POLICY "Users can create their own patient profile"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = id);
