-- =====================================================
-- MOZAMANDU: Google OAuth + Welcome Email + Promocode
-- =====================================================
-- This migration:
-- 1. Updates handle_new_user to support Google OAuth metadata
-- 2. Creates WELCOME5 promocode (5% off for new customers)
-- 3. Creates trigger to send welcome email on new user signup
-- =====================================================

-- =====================================================
-- STEP 1: Update handle_new_user function for Google OAuth
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Handle both email signup (full_name) and Google OAuth (name or full_name)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    'customer'  -- All new users are customers by default
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 2: Create WELCOME5 promocode (5% off for new customers)
-- =====================================================
INSERT INTO public.promocodes (
  code,
  description,
  discount_percentage,
  is_active,
  minimum_order_amount,
  valid_from,
  valid_until
) VALUES (
  'WELCOME5',
  'Welcome discount for new customers - 5% off first order',
  5,
  true,
  0,
  NOW(),
  NOW() + INTERVAL '10 years'
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_percentage = EXCLUDED.discount_percentage,
  is_active = true,
  updated_at = NOW();

-- =====================================================
-- STEP 3: Create function to send welcome email via Edge Function
-- =====================================================
CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get user's full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  -- Get Supabase URL from environment (set in vault or config)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Call the edge function asynchronously using pg_net if available
  -- This is a fire-and-forget call to avoid blocking the signup
  PERFORM net.http_post(
    url := 'https://huwhbxjlyucamitwwhyg.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'userId', NEW.id::text,
      'email', NEW.email,
      'fullName', user_full_name
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 4: Create trigger for welcome email (fires after profile creation)
-- =====================================================
DROP TRIGGER IF EXISTS on_new_user_welcome_email ON auth.users;

CREATE TRIGGER on_new_user_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_on_signup();
