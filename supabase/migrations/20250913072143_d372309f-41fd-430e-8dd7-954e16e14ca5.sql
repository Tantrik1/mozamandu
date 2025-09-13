-- Ensure promocode usage tracking works correctly
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS increment_promocode_usage_on_customer_order ON customer_orders;

-- Create updated function to handle promocode increment
CREATE OR REPLACE FUNCTION increment_promocode_usage_universal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.promocode_used IS NOT NULL AND NEW.promocode_used != '' THEN
    -- Use a more robust update with proper error handling
    UPDATE public.promocodes 
    SET used_count = COALESCE(used_count, 0) + 1 
    WHERE code = NEW.promocode_used;
    
    -- Log for debugging
    RAISE LOG 'Incremented usage count for promocode: %, Current count after increment: %', 
      NEW.promocode_used, 
      (SELECT used_count FROM promocodes WHERE code = NEW.promocode_used);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for customer_orders table
CREATE TRIGGER increment_promocode_usage_on_customer_order
  AFTER INSERT ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_promocode_usage_universal();

-- Create trigger for orders table as well for backward compatibility
CREATE TRIGGER increment_promocode_usage_on_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_promocode_usage_universal();