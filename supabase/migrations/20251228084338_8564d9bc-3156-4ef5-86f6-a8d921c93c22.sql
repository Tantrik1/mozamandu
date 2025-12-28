-- Add UPDATE policies for storage buckets (admins can update files)
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update category images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (bucket_id = 'category-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update subcategory images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'subcategory-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (bucket_id = 'subcategory-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update notice images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'notice-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (bucket_id = 'notice-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update color variant images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'color-variant-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (bucket_id = 'color-variant-images' AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Update bucket file size limits to 10MB (after compression, files should be under 2MB anyway)
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'product-images';
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'category-images';
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'subcategory-images';
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'notice-images';
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'color-variant-images';
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'payment-screenshots';