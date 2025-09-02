-- Test updating the featured status for variant product
UPDATE products 
SET is_featured = true, updated_at = now() 
WHERE id = '4561355b-2992-44ca-a6a8-c7878c5c7ab9';

-- Verify the update worked
SELECT id, name, is_featured, has_color_variants, color_has_size_variants 
FROM products 
WHERE id = '4561355b-2992-44ca-a6a8-c7878c5c7ab9';