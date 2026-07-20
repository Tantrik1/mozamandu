-- Create blog_categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on blog_categories
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_categories
CREATE POLICY "Anyone can view active blog categories"
ON public.blog_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage blog categories"
ON public.blog_categories FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Add category_id to blogs table
ALTER TABLE public.blogs 
ADD COLUMN category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_blogs_category_id ON public.blogs(category_id);
CREATE INDEX idx_blog_categories_slug ON public.blog_categories(slug);

-- Add trigger for updated_at on blog_categories
CREATE TRIGGER update_blog_categories_updated_at
BEFORE UPDATE ON public.blog_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();