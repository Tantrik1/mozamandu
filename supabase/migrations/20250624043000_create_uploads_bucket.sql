
-- Create uploads bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow anyone to upload files (for guest checkout)
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'uploads');

-- Create policy to allow public read access to uploaded files
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

-- Create policy to allow users to update their own uploads
CREATE POLICY "Allow authenticated users to update uploads" ON storage.objects
FOR UPDATE USING (bucket_id = 'uploads');

-- Create policy to allow admins to delete any upload
CREATE POLICY "Allow admin delete access" ON storage.objects
FOR DELETE USING (
  bucket_id = 'uploads' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
