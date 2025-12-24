
-- =============================================
-- MOZAMANDU E-COMMERCE DATABASE MIGRATION
-- Complete schema for Lovable Cloud
-- =============================================

-- =============================================
-- 1. PROFILES TABLE (for user data)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. CATEGORIES TABLE
-- =============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'on' CHECK (status IN ('on', 'off')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 3. SUBCATEGORIES TABLE
-- =============================================
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'on' CHECK (status IN ('on', 'off')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active subcategories" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Admins can manage subcategories" ON public.subcategories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 4. PRODUCTS TABLE
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
  image_url TEXT,
  additional_images TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  has_color_variants BOOLEAN DEFAULT false,
  color_has_size_variants BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 5. COLOR VARIANTS TABLE
-- =============================================
CREATE TABLE public.color_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  color_name TEXT NOT NULL,
  color_code TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.color_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view color variants" ON public.color_variants FOR SELECT USING (true);
CREATE POLICY "Admins can manage color variants" ON public.color_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 6. SIZE VARIANTS TABLE
-- =============================================
CREATE TABLE public.size_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  color_variant_id UUID REFERENCES public.color_variants(id) ON DELETE CASCADE NOT NULL,
  size_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.size_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view size variants" ON public.size_variants FOR SELECT USING (true);
CREATE POLICY "Admins can manage size variants" ON public.size_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 7. PRODUCT INVENTORY TABLE
-- =============================================
CREATE TABLE public.product_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  color_variant_id UUID REFERENCES public.color_variants(id) ON DELETE CASCADE,
  size_variant_id UUID REFERENCES public.size_variants(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category_name TEXT,
  subcategory_name TEXT,
  color_name TEXT,
  size_name TEXT,
  stock_quantity INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0,
  available_stock INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_stock) STORED,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2),
  low_stock_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view inventory" ON public.product_inventory FOR SELECT USING (true);
CREATE POLICY "Admins can manage inventory" ON public.product_inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 8. INVENTORY TRANSACTIONS TABLE
-- =============================================
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.product_inventory(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'remove', 'reserve', 'release', 'fulfill', 'adjust', 'cancel')),
  quantity_change INTEGER NOT NULL DEFAULT 0,
  order_id UUID,
  order_number TEXT,
  reason TEXT,
  previous_stock INTEGER,
  previous_reserved INTEGER,
  new_stock INTEGER,
  new_reserved INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view transactions" ON public.inventory_transactions FOR SELECT USING (true);
CREATE POLICY "Admins can manage transactions" ON public.inventory_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 9. PAYMENT METHODS TABLE
-- =============================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  account_details TEXT,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view payment methods" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 10. DELIVERY CHARGES TABLE
-- =============================================
CREATE TABLE public.delivery_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_name TEXT NOT NULL,
  charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view delivery charges" ON public.delivery_charges FOR SELECT USING (true);
CREATE POLICY "Admins can manage delivery charges" ON public.delivery_charges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 11. PROMO CODES TABLE
-- =============================================
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 12. GUEST ORDERS TABLE (for non-logged in users)
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  whatsapp_number TEXT,
  delivery_address TEXT NOT NULL,
  delivery_location_id UUID REFERENCES public.delivery_charges(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  promocode_used TEXT,
  promocode_discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2) DEFAULT 0,
  payment_screenshot_url TEXT,
  pricing_breakdown JSONB,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_confirmed', 'on_delivery', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view orders by order number" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 13. GUEST ORDER ITEM DETAILS TABLE
-- =============================================
CREATE TABLE public.order_item_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_inventory_id UUID REFERENCES public.product_inventory(id),
  sku TEXT,
  product_name TEXT NOT NULL,
  color_name TEXT,
  size_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  pricing_mode TEXT DEFAULT 'normal',
  pricing_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.order_item_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view order items" ON public.order_item_details FOR SELECT USING (true);
CREATE POLICY "Anyone can create order items" ON public.order_item_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage order items" ON public.order_item_details FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 14. CUSTOMER ORDERS TABLE (for logged in users)
-- =============================================
CREATE TABLE public.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  whatsapp_number TEXT,
  delivery_address TEXT NOT NULL,
  delivery_location_id UUID REFERENCES public.delivery_charges(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  promocode_used TEXT,
  promocode_discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2) DEFAULT 0,
  payment_screenshot_url TEXT,
  pricing_breakdown JSONB,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_confirmed', 'on_delivery', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.customer_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON public.customer_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all customer orders" ON public.customer_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 15. CUSTOMER ORDER ITEM DETAILS TABLE
-- =============================================
CREATE TABLE public.customer_order_item_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.customer_orders(id) ON DELETE CASCADE NOT NULL,
  product_inventory_id UUID REFERENCES public.product_inventory(id),
  sku TEXT,
  product_name TEXT NOT NULL,
  color_name TEXT,
  size_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  pricing_mode TEXT DEFAULT 'normal',
  pricing_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_order_item_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON public.customer_order_item_details FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customer_orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own order items" ON public.customer_order_item_details FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.customer_orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all order items" ON public.customer_order_item_details FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 16. PRODUCT REVIEWS TABLE
-- =============================================
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create reviews" ON public.product_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage reviews" ON public.product_reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 17. FAQ TABLE
-- =============================================
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view FAQs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Admins can manage FAQs" ON public.faqs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 18. NOTICES TABLE
-- =============================================
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view notices" ON public.notices FOR SELECT USING (true);
CREATE POLICY "Admins can manage notices" ON public.notices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 19. TOP BAR TEXT TABLE
-- =============================================
CREATE TABLE public.top_bar_text (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.top_bar_text ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view top bar text" ON public.top_bar_text FOR SELECT USING (true);
CREATE POLICY "Admins can manage top bar text" ON public.top_bar_text FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 20. CHATBOT KNOWLEDGE TABLE
-- =============================================
CREATE TABLE public.chatbot_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chatbot knowledge" ON public.chatbot_knowledge FOR SELECT USING (true);
CREATE POLICY "Admins can manage chatbot knowledge" ON public.chatbot_knowledge FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 21. SKU GENERATOR FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_product_sku(
  p_product_name TEXT,
  p_color_name TEXT DEFAULT NULL,
  p_size_name TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sku TEXT;
  v_prefix TEXT;
  v_random TEXT;
BEGIN
  -- Create prefix from product name (first 3 chars uppercase)
  v_prefix := UPPER(LEFT(REGEXP_REPLACE(p_product_name, '[^a-zA-Z]', '', 'g'), 3));
  
  -- Add color initial if exists
  IF p_color_name IS NOT NULL THEN
    v_prefix := v_prefix || '-' || UPPER(LEFT(REGEXP_REPLACE(p_color_name, '[^a-zA-Z]', '', 'g'), 2));
  END IF;
  
  -- Add size if exists
  IF p_size_name IS NOT NULL THEN
    v_prefix := v_prefix || '-' || UPPER(LEFT(REGEXP_REPLACE(p_size_name, '[^a-zA-Z0-9]', '', 'g'), 2));
  END IF;
  
  -- Add random suffix
  v_random := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  v_sku := v_prefix || '-' || v_random;
  
  RETURN v_sku;
END;
$$;

-- =============================================
-- 22. SAFE STOCK UPDATE FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.safe_update_stock(
  p_product_id UUID,
  p_stock_change INTEGER,
  p_color_variant_id UUID DEFAULT NULL,
  p_size_variant_id UUID DEFAULT NULL,
  p_reservation_change INTEGER DEFAULT 0,
  p_reason TEXT DEFAULT 'Manual adjustment',
  p_transaction_type TEXT DEFAULT 'adjust'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_inventory_id UUID;
  v_current_stock INTEGER;
  v_current_reserved INTEGER;
  v_new_stock INTEGER;
  v_new_reserved INTEGER;
BEGIN
  -- Find the inventory record
  SELECT id, stock_quantity, reserved_stock
  INTO v_inventory_id, v_current_stock, v_current_reserved
  FROM public.product_inventory
  WHERE product_id = p_product_id
    AND (color_variant_id = p_color_variant_id OR (color_variant_id IS NULL AND p_color_variant_id IS NULL))
    AND (size_variant_id = p_size_variant_id OR (size_variant_id IS NULL AND p_size_variant_id IS NULL))
  LIMIT 1;
  
  IF v_inventory_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory record not found');
  END IF;
  
  -- Calculate new values
  v_new_stock := v_current_stock + p_stock_change;
  v_new_reserved := GREATEST(0, v_current_reserved + p_reservation_change);
  
  -- Validate
  IF v_new_stock < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock');
  END IF;
  
  -- Update inventory
  UPDATE public.product_inventory
  SET 
    stock_quantity = v_new_stock,
    reserved_stock = v_new_reserved,
    updated_at = now()
  WHERE id = v_inventory_id;
  
  -- Log transaction
  INSERT INTO public.inventory_transactions (
    inventory_id, transaction_type, quantity_change, reason,
    previous_stock, previous_reserved, new_stock, new_reserved
  ) VALUES (
    v_inventory_id, p_transaction_type, p_stock_change, p_reason,
    v_current_stock, v_current_reserved, v_new_stock, v_new_reserved
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'inventory_id', v_inventory_id,
    'new_stock', v_new_stock,
    'new_reserved', v_new_reserved,
    'new_available', v_new_stock - v_new_reserved
  );
END;
$$;

-- =============================================
-- 23. ORDER NUMBER GENERATOR FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date TEXT;
  v_random TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  v_random := LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  RETURN 'ORD-' || v_date || '-' || v_random;
END;
$$;

-- =============================================
-- 24. UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_color_variants_updated_at BEFORE UPDATE ON public.color_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_size_variants_updated_at BEFORE UPDATE ON public.size_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_inventory_updated_at BEFORE UPDATE ON public.product_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_charges_updated_at BEFORE UPDATE ON public.delivery_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_orders_updated_at BEFORE UPDATE ON public.customer_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_top_bar_text_updated_at BEFORE UPDATE ON public.top_bar_text FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chatbot_knowledge_updated_at BEFORE UPDATE ON public.chatbot_knowledge FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 25. CREATE STORAGE BUCKET FOR PAYMENT SCREENSHOTS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', true);

-- Storage policies
CREATE POLICY "Anyone can upload payment screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');
CREATE POLICY "Anyone can view payment screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots');
CREATE POLICY "Admins can delete payment screenshots" ON storage.objects FOR DELETE USING (
  bucket_id = 'payment-screenshots' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
