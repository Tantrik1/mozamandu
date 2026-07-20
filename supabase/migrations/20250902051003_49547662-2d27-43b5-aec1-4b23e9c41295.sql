-- Reset the test product back to not featured
UPDATE products 
SET is_featured = false, updated_at = now() 
WHERE id = '4561355b-2992-44ca-a6a8-c7878c5c7ab9';