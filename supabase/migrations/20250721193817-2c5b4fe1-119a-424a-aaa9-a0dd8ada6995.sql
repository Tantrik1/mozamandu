-- Fix the promo code trigger to ensure proper counting for all order types
-- and add real-time trigger for navbar items

-- First, let's create a more robust trigger function for promo code counting
CREATE OR REPLACE FUNCTION public.increment_promocode_usage_universal()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Ensure the trigger exists on customer_orders table
DROP TRIGGER IF EXISTS update_promocode_usage_universal_trigger ON public.customer_orders;
CREATE TRIGGER update_promocode_usage_universal_trigger
    AFTER INSERT ON public.customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_promocode_usage_universal();

-- Also ensure it exists on orders table (legacy support)
DROP TRIGGER IF EXISTS update_promocode_usage_universal_trigger ON public.orders;
CREATE TRIGGER update_promocode_usage_universal_trigger
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_promocode_usage_universal();

-- Enable real-time for navbar_items table
ALTER TABLE public.navbar_items REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.navbar_items;