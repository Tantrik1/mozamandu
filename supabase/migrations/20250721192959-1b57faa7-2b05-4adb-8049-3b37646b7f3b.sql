-- Fix promo code usage count
UPDATE promocodes 
SET used_count = (
  SELECT COALESCE(
    (SELECT COUNT(*) FROM customer_orders WHERE promocode_used = promocodes.code), 0
  ) + COALESCE(
    (SELECT COUNT(*) FROM orders WHERE promocode_used = promocodes.code), 0
  )
)
WHERE code = 'MOZA5';

-- Add Tank Tops category to navbar
INSERT INTO navbar_items (category_id, item_type, display_order, is_visible)
SELECT id, 'category', 4, true
FROM categories 
WHERE name = 'Tank Tops'
ON CONFLICT DO NOTHING;