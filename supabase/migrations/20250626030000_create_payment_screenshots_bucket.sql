
-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-screenshots',
  'payment-screenshots',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policy to allow anyone to upload payment screenshots
CREATE POLICY "Anyone can upload payment screenshots" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');

-- Create storage policy to allow anyone to view payment screenshots
CREATE POLICY "Anyone can view payment screenshots" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-screenshots');
