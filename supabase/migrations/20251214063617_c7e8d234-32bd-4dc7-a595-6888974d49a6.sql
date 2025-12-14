-- Drop combo_subcategories table first (has foreign key to combos)
DROP TABLE IF EXISTS combo_subcategories;

-- Drop combos table
DROP TABLE IF EXISTS combos;

-- Remove combo_applied column from customer_orders table
ALTER TABLE customer_orders DROP COLUMN IF EXISTS combo_applied;

-- Remove combo_applied column from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS combo_applied;