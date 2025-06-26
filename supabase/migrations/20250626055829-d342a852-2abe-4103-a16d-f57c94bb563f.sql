
-- Fix RLS policies for orders table to allow guest checkout
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Create new policies that properly support guest checkout
CREATE POLICY "Anyone can create orders" ON public.orders
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view orders" ON public.orders
FOR SELECT USING (
  -- Guest orders (no user_id) can be viewed by anyone temporarily
  (user_id IS NULL) OR
  -- Authenticated users can see their own orders
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  -- Admins can see all orders
  (auth.uid() IS NOT NULL AND public.is_admin())
);

CREATE POLICY "Admins can update orders" ON public.orders
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND public.is_admin()
);

-- Fix RLS policies for order_items table
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items" ON public.order_items
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view order items" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      (orders.user_id IS NULL) OR
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
      (auth.uid() IS NOT NULL AND public.is_admin())
    )
  )
);

-- Fix RLS policies for order_item_details table
DROP POLICY IF EXISTS "Users can view their order item details" ON public.order_item_details;
DROP POLICY IF EXISTS "Anyone can create order item details" ON public.order_item_details;

CREATE POLICY "Anyone can create order item details" ON public.order_item_details
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view order item details" ON public.order_item_details
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_item_details.order_id 
    AND (
      (orders.user_id IS NULL) OR
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
      (auth.uid() IS NOT NULL AND public.is_admin())
    )
  )
);
