-- Drop existing insecure view policy
DROP POLICY IF EXISTS "Enhanced view policy for customer orders" ON public.customer_orders;

-- Create secure view policy - only authenticated users see their own orders, admins see all
CREATE POLICY "Users can view their own customer orders" 
ON public.customer_orders 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR 
  (auth.uid() IS NOT NULL AND is_admin())
);

-- Also fix the related tables that might expose data through joins
DROP POLICY IF EXISTS "Enhanced view policy for customer order items" ON public.customer_order_items;
DROP POLICY IF EXISTS "Enhanced view policy for customer order item details" ON public.customer_order_item_details;

CREATE POLICY "Users can view their own customer order items" 
ON public.customer_order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM customer_orders co
    WHERE co.id = customer_order_items.order_id
    AND ((auth.uid() IS NOT NULL AND co.user_id = auth.uid()) OR (auth.uid() IS NOT NULL AND is_admin()))
  )
);

CREATE POLICY "Users can view their own customer order item details" 
ON public.customer_order_item_details 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM customer_orders co
    WHERE co.id = customer_order_item_details.order_id
    AND ((auth.uid() IS NOT NULL AND co.user_id = auth.uid()) OR (auth.uid() IS NOT NULL AND is_admin()))
  )
);