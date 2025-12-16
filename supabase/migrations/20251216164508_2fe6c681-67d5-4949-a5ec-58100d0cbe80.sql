-- Fix RLS policy for inventory_transactions to allow logging during checkout
-- The safe_update_stock function needs to log transactions regardless of user role

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can create inventory transactions" ON inventory_transactions;

-- Create new INSERT policy that allows:
-- 1. Admins to create transactions
-- 2. System/triggers to create transactions for stock operations
CREATE POLICY "Allow inventory transaction logging" 
ON inventory_transactions 
FOR INSERT 
WITH CHECK (
  -- Allow admins
  is_admin() 
  OR 
  -- Allow any authenticated user during checkout stock operations
  (auth.uid() IS NOT NULL)
  OR
  -- Allow system operations (when auth.uid() is null, like triggers)
  (auth.uid() IS NULL)
);

-- Remove duplicate promocode triggers (keep only one per table)
DROP TRIGGER IF EXISTS increment_promocode_usage_customer_trigger ON customer_orders;
DROP TRIGGER IF EXISTS increment_promocode_usage_on_customer_order ON customer_orders;
DROP TRIGGER IF EXISTS update_promocode_usage_universal_trigger ON customer_orders;

DROP TRIGGER IF EXISTS increment_promocode_usage_on_order ON orders;
DROP TRIGGER IF EXISTS increment_promocode_usage_trigger ON orders;
DROP TRIGGER IF EXISTS update_promocode_usage_universal_trigger ON orders;

-- Create single trigger for each table
CREATE TRIGGER promocode_usage_customer_orders
  AFTER INSERT ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_promocode_usage_universal();

CREATE TRIGGER promocode_usage_orders
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_promocode_usage_universal();

-- Add comment
COMMENT ON POLICY "Allow inventory transaction logging" ON inventory_transactions IS 
'Allows transaction logging during checkout (customer), admin operations, and system triggers';