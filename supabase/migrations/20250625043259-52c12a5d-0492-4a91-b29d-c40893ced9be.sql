
-- Update RLS policies for orders table to allow customers to create orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Allow users to view their own orders (both authenticated users and guest orders)
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.role() = 'authenticated'
  );

-- Allow authenticated users and guests to create orders
CREATE POLICY "Authenticated users can create orders" ON public.orders
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL OR
    auth.role() = 'authenticated'
  );

-- Allow users to update their own orders
CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Update RLS policies for order_items table
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Allow users to view order items for their orders
CREATE POLICY "Users can view their order items" ON public.order_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.user_id = auth.uid() OR 
        orders.user_id IS NULL OR
        auth.role() = 'authenticated'
      )
    )
  );

-- Allow authenticated users to create order items
CREATE POLICY "Authenticated users can create order items" ON public.order_items
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.user_id = auth.uid() OR 
        orders.user_id IS NULL OR
        auth.role() = 'authenticated'
      )
    )
  );

-- Allow users to update order items for their orders
CREATE POLICY "Users can update their order items" ON public.order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
    )
  );
