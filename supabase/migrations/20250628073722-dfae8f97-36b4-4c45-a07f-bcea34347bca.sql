
-- First, let's check if the uploads bucket exists and ensure it's properly configured for guest uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Drop existing restrictive policies that might be blocking guest uploads
DROP POLICY IF EXISTS "Allow public uploads to payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete access to payment screenshots" ON storage.objects;

-- Create comprehensive policies that allow guest uploads
CREATE POLICY "Allow anyone to upload payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots'
);

CREATE POLICY "Allow anyone to read payment screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots'
);

CREATE POLICY "Allow anyone to update payment screenshots"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots'
);

CREATE POLICY "Allow anyone to delete payment screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots'
);
