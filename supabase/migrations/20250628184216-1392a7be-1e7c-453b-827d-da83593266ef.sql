
-- Create separate buckets for different user types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('customer-payments', 'customer-payments', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('admin-payments', 'admin-payments', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('guest-payments', 'guest-payments', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Create policies for customer payments bucket
CREATE POLICY "Allow customers to upload to customer-payments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-payments' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow customers to read customer-payments"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-payments');

CREATE POLICY "Allow customers to update customer-payments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-payments' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow customers to delete customer-payments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-payments' AND 
  auth.role() = 'authenticated'
);

-- Create policies for admin payments bucket
CREATE POLICY "Allow admins to upload to admin-payments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'admin-payments' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow admins to read admin-payments"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-payments');

CREATE POLICY "Allow admins to update admin-payments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'admin-payments' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow admins to delete admin-payments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'admin-payments' AND 
  auth.role() = 'authenticated'
);

-- Create policies for guest payments bucket (most permissive)
CREATE POLICY "Allow anyone to upload to guest-payments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'guest-payments');

CREATE POLICY "Allow anyone to read guest-payments"
ON storage.objects FOR SELECT
USING (bucket_id = 'guest-payments');

CREATE POLICY "Allow anyone to update guest-payments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'guest-payments');

CREATE POLICY "Allow anyone to delete guest-payments"
ON storage.objects FOR DELETE
USING (bucket_id = 'guest-payments');
