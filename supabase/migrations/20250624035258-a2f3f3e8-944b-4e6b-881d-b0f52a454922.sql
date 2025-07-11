
-- Create orders table to store order information
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE,
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  whatsapp_number TEXT,
  
  -- Delivery information
  delivery_location_id UUID REFERENCES public.delivery_charges(id),
  delivery_address TEXT NOT NULL,
  delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Order amounts
  subtotal DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Discounts and promotions
  combo_applied BOOLEAN DEFAULT FALSE,
  combo_details JSONB,
  promocode_used TEXT,
  promocode_discount DECIMAL(10,2) DEFAULT 0,
  
  -- Payment information
  payment_method_id UUID REFERENCES public.payment_methods(id),
  payment_screenshot_url TEXT,
  payment_notes TEXT,
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table to store individual order items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  color_variant_id UUID REFERENCES public.color_variants(id),
  size_variant_id UUID REFERENCES public.size_variants(id),
  
  product_name TEXT NOT NULL,
  color_name TEXT,
  size_name TEXT,
  
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  pricing_mode TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'discount', 'combo'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_verification_codes table for OTP verification
CREATE TABLE public.email_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Anyone can create orders (for guest checkout)
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT 
  WITH CHECK (true);

-- Add RLS policies for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Users can view order items for their orders
CREATE POLICY "Users can view their order items" ON public.order_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
    )
  );

-- Anyone can create order items
CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT 
  WITH CHECK (true);

-- Add RLS policies for email_verification_codes
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can create verification codes
CREATE POLICY "Anyone can create verification codes" ON public.email_verification_codes
  FOR INSERT 
  WITH CHECK (true);

-- Anyone can read their own verification codes
CREATE POLICY "Anyone can read verification codes" ON public.email_verification_codes
  FOR SELECT 
  USING (true);

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Add default order number generation
ALTER TABLE public.orders 
ALTER COLUMN order_number SET DEFAULT generate_order_number();

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_email_verification_codes_email ON public.email_verification_codes(email);
