
-- Add contact_number and whatsapp_number columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN contact_number TEXT,
ADD COLUMN whatsapp_number TEXT;
