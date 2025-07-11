
-- Drop existing restrictive policies for orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create new policies that properly handle both guest and authenticated users
CREATE POLICY "Users can view orders" ON public.orders
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    user_id IS NULL OR 
    auth.uid() IS NULL
  );

CREATE POLICY "Anyone can create orders including guests" ON public.orders
  FOR INSERT 
  WITH CHECK (true);

-- Drop existing restrictive policies for order_items  
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Create new policies for order_items that work with guests
CREATE POLICY "Users can view order items" ON public.order_items
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create order items including guests" ON public.order_items
  FOR INSERT 
  WITH CHECK (true);

-- Also update order_item_details policies if they exist
DROP POLICY IF EXISTS "Users can view order item details" ON public.order_item_details;
DROP POLICY IF EXISTS "Anyone can create order item details" ON public.order_item_details;

CREATE POLICY "Anyone can view order item details" ON public.order_item_details
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create order item details" ON public.order_item_details
  FOR INSERT 
  WITH CHECK (true);
