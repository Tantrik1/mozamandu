
-- Drop existing restrictive policies for customer_orders
DROP POLICY IF EXISTS "Customers can create their own orders" ON public.customer_orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.customer_orders;

-- Create comprehensive policies for customer_orders that handle authenticated customers, guests, and admins

-- Policy 1: Allow authenticated customers to view their own orders, admins to view all, guests to view orders they created
CREATE POLICY "Enhanced view policy for customer orders" ON public.customer_orders
  FOR SELECT 
  USING (
    -- Authenticated customers can see their own orders
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    -- Admins can see all orders
    (auth.uid() IS NOT NULL AND is_admin()) OR
    -- Allow viewing of guest orders (for order tracking, receipt viewing, etc.)
    (user_id IS NULL)
  );

-- Policy 2: Allow order creation for authenticated customers, guests, and admins
CREATE POLICY "Enhanced creation policy for customer orders" ON public.customer_orders
  FOR INSERT 
  WITH CHECK (
    -- Authenticated customers can create orders with their user_id
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    -- Guests can create orders with null user_id (both when not logged in and when explicitly set to null)
    (user_id IS NULL) OR
    -- Admins can create orders for anyone
    (auth.uid() IS NOT NULL AND is_admin())
  );

-- Policy 3: Allow authenticated customers to update their own orders, admins to update any order
CREATE POLICY "Enhanced update policy for customer orders" ON public.customer_orders
  FOR UPDATE
  USING (
    -- Customers can update their own orders
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    -- Admins can update any order
    (auth.uid() IS NOT NULL AND is_admin())
  )
  WITH CHECK (
    -- Same conditions for the updated data
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NOT NULL AND is_admin())
  );

-- Policy 4: Allow admins to delete orders if needed
CREATE POLICY "Enhanced delete policy for customer orders" ON public.customer_orders
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND is_admin()
  );

-- Update RLS policies for customer_order_items to work with the new customer_orders policies
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.customer_order_items;
DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.customer_order_items;

-- Enhanced policy for viewing customer order items
CREATE POLICY "Enhanced view policy for customer order items" ON public.customer_order_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM customer_orders 
      WHERE customer_orders.id = customer_order_items.order_id 
      AND (
        -- User's own orders
        (auth.uid() IS NOT NULL AND customer_orders.user_id = auth.uid()) OR
        -- Guest orders
        (customer_orders.user_id IS NULL) OR
        -- Admin can see all
        (auth.uid() IS NOT NULL AND is_admin())
      )
    )
  );

-- Enhanced policy for creating customer order items
CREATE POLICY "Enhanced creation policy for customer order items" ON public.customer_order_items
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_orders 
      WHERE customer_orders.id = customer_order_items.order_id 
      AND (
        -- For user's own orders
        (auth.uid() IS NOT NULL AND customer_orders.user_id = auth.uid()) OR
        -- For guest orders
        (customer_orders.user_id IS NULL) OR
        -- Admins can create for any order
        (auth.uid() IS NOT NULL AND is_admin())
      )
    )
  );

-- Update RLS policies for customer_order_item_details
DROP POLICY IF EXISTS "Users can create order item details for their orders" ON public.customer_order_item_details;
DROP POLICY IF EXISTS "Users can view order item details for their orders" ON public.customer_order_item_details;

-- Enhanced policy for viewing customer order item details
CREATE POLICY "Enhanced view policy for customer order item details" ON public.customer_order_item_details
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM customer_orders 
      WHERE customer_orders.id = customer_order_item_details.order_id 
      AND (
        -- User's own orders
        (auth.uid() IS NOT NULL AND customer_orders.user_id = auth.uid()) OR
        -- Guest orders
        (customer_orders.user_id IS NULL) OR
        -- Admin can see all
        (auth.uid() IS NOT NULL AND is_admin())
      )
    )
  );

-- Enhanced policy for creating customer order item details
CREATE POLICY "Enhanced creation policy for customer order item details" ON public.customer_order_item_details
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_orders 
      WHERE customer_orders.id = customer_order_item_details.order_id 
      AND (
        -- For user's own orders
        (auth.uid() IS NOT NULL AND customer_orders.user_id = auth.uid()) OR
        -- For guest orders
        (customer_orders.user_id IS NULL) OR
        -- Admins can create for any order
        (auth.uid() IS NOT NULL AND is_admin())
      )
    )
  );
