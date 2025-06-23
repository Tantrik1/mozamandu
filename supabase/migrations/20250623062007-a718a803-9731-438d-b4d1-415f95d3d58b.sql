
-- Create enum types for better data integrity
CREATE TYPE public.user_role AS ENUM ('admin', 'customer');
CREATE TYPE public.product_status AS ENUM ('active', 'inactive');
CREATE TYPE public.category_status AS ENUM ('on', 'off');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status category_status NOT NULL DEFAULT 'on',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  selling_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_unit TEXT CHECK (discount_unit IN ('percentage', 'fixed')) DEFAULT 'percentage',
  status category_status NOT NULL DEFAULT 'on',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id),
  description TEXT,
  cost_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2), -- Can override subcategory price
  is_featured BOOLEAN DEFAULT FALSE,
  has_color_variants BOOLEAN DEFAULT FALSE,
  has_size_variants BOOLEAN DEFAULT FALSE,
  status product_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create color variants table
CREATE TABLE public.color_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_code TEXT, -- Hex color code
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create size variants table (sizes within colors)
CREATE TABLE public.size_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  color_variant_id UUID NOT NULL REFERENCES public.color_variants(id) ON DELETE CASCADE,
  size_name TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product images table
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_variant_id UUID REFERENCES public.color_variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Create RLS policies for categories (public read, admin write)
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (status = 'on');

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin());

-- Create RLS policies for subcategories
CREATE POLICY "Anyone can view active subcategories" ON public.subcategories
  FOR SELECT USING (status = 'on');

CREATE POLICY "Admins can manage subcategories" ON public.subcategories
  FOR ALL USING (public.is_admin());

-- Create RLS policies for products
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin());

-- Create RLS policies for color variants
CREATE POLICY "Anyone can view color variants" ON public.color_variants
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage color variants" ON public.color_variants
  FOR ALL USING (public.is_admin());

-- Create RLS policies for size variants
CREATE POLICY "Anyone can view size variants" ON public.size_variants
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage size variants" ON public.size_variants
  FOR ALL USING (public.is_admin());

-- Create RLS policies for product images
CREATE POLICY "Anyone can view product images" ON public.product_images
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage product images" ON public.product_images
  FOR ALL USING (public.is_admin());

-- Create trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default categories
INSERT INTO public.categories (name, description, status) VALUES
  ('Socks', 'Comfortable and stylish socks for everyday wear', 'on'),
  ('Boxers', 'Premium quality boxers for ultimate comfort', 'on'),
  ('Caps', 'Trendy caps and headwear collection', 'on');
