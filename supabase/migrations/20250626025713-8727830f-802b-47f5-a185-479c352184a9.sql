
-- Create orders table with enhanced status options
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT public.generate_order_number(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be null for guest orders
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  whatsapp_number TEXT,
  delivery_address TEXT NOT NULL,
  delivery_location_id UUID REFERENCES public.delivery_charges(id),
  delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'processing', 'verified', 'in_delivery', 'delivered', 'cancelled', 'refunded'
  )),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  payment_notes TEXT,
  payment_screenshot_url TEXT,
  combo_applied BOOLEAN DEFAULT FALSE,
  promocode_used TEXT,
  promocode_discount DECIMAL(10,2) DEFAULT 0,
  pricing_breakdown JSONB, -- Store complete pricing breakdown
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table for inventory management
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  color_variant_id UUID REFERENCES public.color_variants(id),
  size_variant_id UUID REFERENCES public.size_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_item_details table for pricing and display information
CREATE TABLE public.order_item_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  color_name TEXT,
  size_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  pricing_mode TEXT NOT NULL DEFAULT 'normal', -- normal, discount, combo
  pricing_details JSONB, -- Store detailed pricing breakdown
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders table
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NOT NULL AND public.is_admin())
);

CREATE POLICY "Anyone can create orders" ON public.orders
FOR INSERT WITH CHECK (true); -- Allow both guest and authenticated users

CREATE POLICY "Admins can update orders" ON public.orders
FOR UPDATE USING (auth.uid() IS NOT NULL AND public.is_admin());

-- RLS Policies for order_items table
CREATE POLICY "Users can view their order items" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
      (auth.uid() IS NOT NULL AND public.is_admin())
    )
  )
);

CREATE POLICY "Anyone can create order items" ON public.order_items
FOR INSERT WITH CHECK (true);

-- RLS Policies for order_item_details table
CREATE POLICY "Users can view their order item details" ON public.order_item_details
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_item_details.order_id 
    AND (
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR
      (auth.uid() IS NOT NULL AND public.is_admin())
    )
  )
);

CREATE POLICY "Anyone can create order item details" ON public.order_item_details
FOR INSERT WITH CHECK (true);

-- Update promocodes usage trigger
CREATE OR REPLACE FUNCTION public.increment_promocode_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promocode_used IS NOT NULL THEN
    UPDATE public.promocodes 
    SET used_count = used_count + 1 
    WHERE code = NEW.promocode_used;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_promocode_usage_trigger
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_promocode_usage();

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_item_details_order_id ON public.order_item_details(order_id);
