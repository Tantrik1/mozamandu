
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductVariant {
  variant_id: string;
  sku: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  stock_quantity: number;
  available_stock: number;
  price: number;
  color_image_url?: string;
  color_hex?: string;
}

export interface ProductColor {
  color_id: string;
  color_name: string;
  hex_code?: string;
  image_url?: string;
  total_stock: number;
}

export interface ProductSize {
  size_id: string;
  size_name: string;
  size_code?: string;
  stock_quantity: number;
  available_stock: number;
  variant_id: string;
  sku: string;
}

export function useProductVariants(productId?: string) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_product_variants', {
        p_product_id: productId
      });

      if (error) throw error;
      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching product variants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch variants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  return { variants, loading, error, refetch: fetchVariants };
}

export function useProductColors(productId?: string) {
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchColors = async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_product_colors', {
        p_product_id: productId
      });

      if (error) throw error;
      setColors(data || []);
    } catch (err) {
      console.error('Error fetching product colors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch colors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
  }, [productId]);

  return { colors, loading, error, refetch: fetchColors };
}

export function useProductSizes(productId?: string, colorName?: string) {
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSizes = async () => {
    if (!productId || !colorName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_product_sizes', {
        p_product_id: productId,
        p_color_name: colorName
      });

      if (error) throw error;
      setSizes(data || []);
    } catch (err) {
      console.error('Error fetching product sizes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sizes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSizes();
  }, [productId, colorName]);

  return { sizes, loading, error, refetch: fetchSizes };
}
