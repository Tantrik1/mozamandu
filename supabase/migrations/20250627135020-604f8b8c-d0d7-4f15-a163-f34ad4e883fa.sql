
-- Ensure uploads bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Create comprehensive storage policies for payment screenshots
CREATE POLICY "Allow public uploads to payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots'
);

CREATE POLICY "Allow public read access to payment screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots'
);

CREATE POLICY "Allow authenticated users to update payment screenshots"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots'
);

CREATE POLICY "Allow admin delete access to payment screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads' AND 
  (storage.foldername(name))[1] = 'payment-screenshots' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
