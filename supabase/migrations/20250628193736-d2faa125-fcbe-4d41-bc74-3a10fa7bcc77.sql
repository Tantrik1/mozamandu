
-- Create a new customer_orders table specifically for logged-in customers
CREATE TABLE public.customer_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL DEFAULT (('ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'))),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  whatsapp_number TEXT,
  delivery_address TEXT NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_charge NUMERIC NOT NULL DEFAULT 0,
  promocode_discount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  payment_percentage INTEGER NOT NULL DEFAULT 100,
  status order_status NOT NULL DEFAULT 'pending_payment',
  payment_method_id UUID REFERENCES payment_methods(id),
  payment_screenshot_url TEXT,
  promocode_used TEXT,
  combo_applied BOOLEAN DEFAULT false,
  pricing_breakdown JSONB,
  delivery_location_id UUID REFERENCES delivery_charges(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customer_order_items table for the items in customer orders
CREATE TABLE public.customer_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  color_variant_id UUID REFERENCES color_variants(id),
  size_variant_id UUID REFERENCES size_variants(id),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customer_order_item_details table for detailed pricing info
CREATE TABLE public.customer_order_item_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  color_name TEXT,
  size_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  pricing_mode TEXT NOT NULL DEFAULT 'normal',
  pricing_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for customer_orders
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- Allow customers to view their own orders
CREATE POLICY "Customers can view their own orders" 
ON public.customer_orders 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow customers to create their own orders
CREATE POLICY "Customers can create their own orders" 
ON public.customer_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all customer orders
CREATE POLICY "Admins can view all customer orders" 
ON public.customer_orders 
FOR ALL 
USING (public.is_admin());

-- Add RLS policies for customer_order_items
ALTER TABLE public.customer_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items for their orders" 
ON public.customer_order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM customer_orders 
    WHERE customer_orders.id = customer_order_items.order_id 
    AND (customer_orders.user_id = auth.uid() OR public.is_admin())
  )
);

CREATE POLICY "Users can create order items for their orders" 
ON public.customer_order_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_orders 
    WHERE customer_orders.id = customer_order_items.order_id 
    AND customer_orders.user_id = auth.uid()
  )
);

-- Add RLS policies for customer_order_item_details
ALTER TABLE public.customer_order_item_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order item details for their orders" 
ON public.customer_order_item_details 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM customer_orders 
    WHERE customer_orders.id = customer_order_item_details.order_id 
    AND (customer_orders.user_id = auth.uid() OR public.is_admin())
  )
);

CREATE POLICY "Users can create order item details for their orders" 
ON public.customer_order_item_details 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_orders 
    WHERE customer_orders.id = customer_order_item_details.order_id 
    AND customer_orders.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_customer_orders_user_id ON customer_orders(user_id);
CREATE INDEX idx_customer_orders_status ON customer_orders(status);
CREATE INDEX idx_customer_order_items_order_id ON customer_order_items(order_id);
CREATE INDEX idx_customer_order_item_details_order_id ON customer_order_item_details(order_id);
