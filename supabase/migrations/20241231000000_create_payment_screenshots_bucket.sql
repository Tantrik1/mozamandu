
-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true);

-- Create policy to allow authenticated users to upload payment screenshots
CREATE POLICY "Allow authenticated users to upload payment screenshots" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payment-screenshots' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow public read access to payment screenshots
CREATE POLICY "Allow public read access to payment screenshots" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-screenshots');

-- Create policy to allow users to update their own payment screenshots
CREATE POLICY "Allow users to update their own payment screenshots" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'payment-screenshots' AND
  auth.role() = 'authenticated'
);
