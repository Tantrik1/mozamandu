
-- Create promocodes table
CREATE TABLE public.promocodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  minimum_order_amount NUMERIC(10,2) DEFAULT 0,
  maximum_discount_amount NUMERIC(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery_charges table
CREATE TABLE public.delivery_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_name TEXT NOT NULL,
  delivery_price NUMERIC(10,2) NOT NULL CHECK (delivery_price >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_promocodes_code ON public.promocodes(code);
CREATE INDEX idx_promocodes_active ON public.promocodes(is_active);
CREATE INDEX idx_delivery_charges_active ON public.delivery_charges(is_active);

-- Enable RLS (though these are admin-managed, we'll keep them simple for now)
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_charges ENABLE ROW LEVEL SECURITY;

-- Create policies allowing authenticated users to read, but we'll handle admin checks in the app
CREATE POLICY "Allow read access to promocodes" ON public.promocodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to delivery charges" ON public.delivery_charges FOR SELECT TO authenticated USING (true);

-- Admin policies for full access (we'll check admin role in the application)
CREATE POLICY "Allow admin full access to promocodes" ON public.promocodes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin full access to delivery charges" ON public.delivery_charges FOR ALL TO authenticated USING (true);
