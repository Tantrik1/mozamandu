
-- Create a storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true);

-- Create policy to allow anyone to upload files
CREATE POLICY "Anyone can upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'uploads');

-- Create policy to allow anyone to view files (since bucket is public)
CREATE POLICY "Anyone can view files" ON storage.objects
FOR SELECT USING (bucket_id = 'uploads');

-- Create policy to allow anyone to update their own files
CREATE POLICY "Anyone can update files" ON storage.objects
FOR UPDATE USING (bucket_id = 'uploads');

-- Create policy to allow anyone to delete files
CREATE POLICY "Anyone can delete files" ON storage.objects
FOR DELETE USING (bucket_id = 'uploads');
