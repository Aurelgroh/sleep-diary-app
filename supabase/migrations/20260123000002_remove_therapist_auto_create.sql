-- Remove auto-create trigger for therapists
-- Therapists will now be created by admin via Supabase Dashboard
-- and activated through the setup flow

-- Drop the auto-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created_therapist ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_therapist();
