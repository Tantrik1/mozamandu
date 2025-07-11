
-- First, let's create a security definer function to check if the current user is an admin
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies that allow admins to view all profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT 
  USING (
    auth.uid() = id OR 
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    public.get_current_user_role() = 'admin'
  );

-- Allow admins to insert profiles (useful for admin operations)
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT 
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Allow admins to delete profiles if needed
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE 
  USING (public.get_current_user_role() = 'admin');
