
-- Create storage bucket for payment QR codes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qr-codes',
  'payment-qr-codes',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for payment QR codes bucket
CREATE POLICY "Allow public read access to payment QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-qr-codes');

CREATE POLICY "Allow authenticated users to upload payment QR codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-qr-codes' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update payment QR codes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-qr-codes' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete payment QR codes"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-qr-codes' AND auth.role() = 'authenticated');
