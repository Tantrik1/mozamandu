
-- Fix RLS policies for orders table to allow proper order creation

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

-- Create comprehensive policies for order management

-- Policy 1: Allow users to view their own orders (both authenticated and guest orders)
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT 
  USING (
    -- Users can see their own orders when logged in
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    -- Admins can see all orders
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Policy 2: Allow order creation for both authenticated users and guests
CREATE POLICY "Allow order creation" ON public.orders
  FOR INSERT 
  WITH CHECK (
    -- Authenticated users can create orders with their user_id
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    -- Guest users can create orders with null user_id
    (auth.uid() IS NULL AND user_id IS NULL) OR
    -- Authenticated users can also create guest orders (user_id = null)
    (auth.uid() IS NOT NULL AND user_id IS NULL)
  );

-- Policy 3: Allow users to update their own orders
CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE
  USING (
    -- Users can update their own orders
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    -- Admins can update any order
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  )
  WITH CHECK (
    -- Same conditions for the updated data
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Policy 4: Allow admins to delete orders
CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix RLS policies for order_items table as well

-- Drop existing problematic policies for order_items
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can update their order items" ON public.order_items;

-- Create comprehensive policies for order_items

-- Policy 1: Allow users to view order items for their orders
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (
        -- User's own orders
        (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
        -- Admin can see all
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      )
    )
  );

-- Policy 2: Allow order items creation for valid orders
CREATE POLICY "Allow order items creation" ON public.order_items
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (
        -- For user's own orders
        (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
        -- For guest orders (either by guest users or authenticated users creating guest orders)
        (orders.user_id IS NULL)
      )
    )
  );

-- Policy 3: Allow order items updates for own orders
CREATE POLICY "Users can update own order items" ON public.order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (
        (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
        (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      )
    )
  );
