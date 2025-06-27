
-- Update navbar_items table to support better management
UPDATE public.navbar_items SET is_visible = true WHERE item_type = 'home';

-- Insert category items for existing categories if they don't exist
INSERT INTO public.navbar_items (item_type, category_id, is_visible, display_order)
SELECT 'category', c.id, true, ROW_NUMBER() OVER (ORDER BY c.name) + 1
FROM public.categories c 
WHERE c.status = 'on' 
AND NOT EXISTS (
  SELECT 1 FROM public.navbar_items ni 
  WHERE ni.item_type = 'category' AND ni.category_id = c.id
);

-- Ensure FAQ item exists
INSERT INTO public.navbar_items (item_type, is_visible, display_order) 
SELECT 'faq', true, 999
WHERE NOT EXISTS (SELECT 1 FROM public.navbar_items WHERE item_type = 'faq');
