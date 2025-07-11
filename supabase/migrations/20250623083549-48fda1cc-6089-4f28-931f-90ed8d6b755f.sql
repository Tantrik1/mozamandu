
-- Add missing foreign key constraints
ALTER TABLE public.color_variants 
ADD CONSTRAINT fk_color_variants_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.size_variants 
ADD CONSTRAINT fk_size_variants_color_variant_id 
FOREIGN KEY (color_variant_id) REFERENCES public.color_variants(id) ON DELETE CASCADE;

ALTER TABLE public.product_images 
ADD CONSTRAINT fk_product_images_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.product_images 
ADD CONSTRAINT fk_product_images_color_variant_id 
FOREIGN KEY (color_variant_id) REFERENCES public.color_variants(id) ON DELETE CASCADE;

-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the product-images bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
