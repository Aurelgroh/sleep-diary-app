-- Create a function to automatically create therapist profile on signup
-- This runs with SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION public.handle_new_therapist()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create therapist if the role is 'therapist'
  IF NEW.raw_user_meta_data->>'role' = 'therapist' THEN
    INSERT INTO public.therapists (id, email, name, credentials)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
      NEW.raw_user_meta_data->>'credentials'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_therapist
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_therapist();

-- Drop the manual INSERT policy since we're using a trigger now
DROP POLICY IF EXISTS "Users can create their own therapist profile" ON therapists;
