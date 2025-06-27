
-- Create a table to manage navbar items
CREATE TABLE public.navbar_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('home', 'category', 'faq')),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_type, category_id)
);

-- Insert default navbar items
INSERT INTO public.navbar_items (item_type, is_visible, display_order) VALUES 
('home', true, 1),
('faq', true, 999);

-- Insert category items for existing categories
INSERT INTO public.navbar_items (item_type, category_id, is_visible, display_order)
SELECT 'category', id, true, ROW_NUMBER() OVER (ORDER BY name) + 1
FROM public.categories 
WHERE status = 'on';

-- Enable RLS
ALTER TABLE public.navbar_items ENABLE ROW LEVEL SECURITY;

-- Create policies for navbar_items
CREATE POLICY "Everyone can view navbar items" ON public.navbar_items FOR SELECT USING (true);
CREATE POLICY "Only admins can manage navbar items" ON public.navbar_items FOR ALL USING (public.is_admin());
