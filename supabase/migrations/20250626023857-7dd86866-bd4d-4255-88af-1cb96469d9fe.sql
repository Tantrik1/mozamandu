
-- Update RLS policies to allow guest orders and proper access

-- First, let's update the orders table RLS policies to allow guest orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

-- Create new policies for orders table that support both guest and authenticated users
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT USING (
  -- Authenticated users can see their own orders
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  -- Admins can see all orders
  (auth.uid() IS NOT NULL AND public.is_admin())
);

CREATE POLICY "Users can create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Authenticated users can create orders for themselves
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  -- Guest users can create orders (user_id will be null)
  (auth.uid() IS NULL AND user_id IS NULL) OR
  -- Authenticated users can also create guest orders
  (auth.uid() IS NOT NULL AND user_id IS NULL)
);

CREATE POLICY "Admins can update orders" ON public.orders
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND public.is_admin()
);

-- Update order_items RLS policies to allow proper access
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

CREATE POLICY "Users can view order items" ON public.order_items
FOR SELECT USING (
  -- Check if user can access the related order
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
      (auth.uid() IS NOT NULL AND public.is_admin())
    )
  )
);

CREATE POLICY "Users can create order items" ON public.order_items
FOR INSERT WITH CHECK (
  -- Check if user can create items for the related order
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
      (auth.uid() IS NULL AND orders.user_id IS NULL) OR
      (auth.uid() IS NOT NULL AND orders.user_id IS NULL)
    )
  )
);

CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT USING (
  auth.uid() IS NOT NULL AND public.is_admin()
);

-- Ensure promocodes can be accessed by both guests and authenticated users
DROP POLICY IF EXISTS "Anyone can view active promocodes" ON public.promocodes;
CREATE POLICY "Anyone can view active promocodes" ON public.promocodes
FOR SELECT USING (is_active = true);

-- Ensure delivery charges can be accessed by both guests and authenticated users  
DROP POLICY IF EXISTS "Anyone can view active delivery charges" ON public.delivery_charges;
CREATE POLICY "Anyone can view active delivery charges" ON public.delivery_charges
FOR SELECT USING (is_active = true);

-- Ensure payment methods can be accessed by both guests and authenticated users
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods
FOR SELECT USING (is_active = true);
