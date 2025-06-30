
-- Create trigger to increment promocode usage for both orders and customer_orders tables
CREATE OR REPLACE FUNCTION public.increment_promocode_usage_universal()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.promocode_used IS NOT NULL AND NEW.promocode_used != '' THEN
    UPDATE public.promocodes 
    SET used_count = used_count + 1 
    WHERE code = NEW.promocode_used;
    
    RAISE LOG 'Incremented usage count for promocode: %', NEW.promocode_used;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS increment_promocode_usage_trigger ON public.orders;
DROP TRIGGER IF EXISTS increment_promocode_usage_trigger ON public.customer_orders;

-- Create triggers for both tables
CREATE TRIGGER increment_promocode_usage_trigger
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_promocode_usage_universal();

CREATE TRIGGER increment_promocode_usage_customer_trigger
  AFTER INSERT ON public.customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_promocode_usage_universal();
