
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
      // Fetch variants from product_inventory table directly
      const { data, error } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (error) throw error;
      
      const transformedVariants: ProductVariant[] = (data || []).map(inv => ({
        variant_id: inv.id,
        sku: inv.sku,
        product_name: inv.product_name,
        color_name: inv.color_name || undefined,
        size_name: inv.size_name || undefined,
        stock_quantity: inv.stock_quantity || 0,
        available_stock: (inv.stock_quantity || 0) - (inv.reserved_stock || 0),
        price: inv.selling_price || inv.cost_price,
      }));
      
      setVariants(transformedVariants);
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
      // Fetch color variants from color_variants table
      const { data, error } = await supabase
        .from('color_variants')
        .select('*, product_inventory!inner(stock_quantity, reserved_stock)')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (error) throw error;
      
      const transformedColors: ProductColor[] = (data || []).map(cv => {
        const inventory = cv.product_inventory as any[];
        const totalStock = inventory?.reduce((sum: number, inv: any) => sum + ((inv.stock_quantity || 0) - (inv.reserved_stock || 0)), 0) || 0;
        
        return {
          color_id: cv.id,
          color_name: cv.color_name,
          hex_code: cv.color_code || undefined,
          image_url: cv.image_url || undefined,
          total_stock: totalStock,
        };
      });
      
      setColors(transformedColors);
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
      // Fetch sizes from product_inventory filtered by color
      const { data, error } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('color_name', colorName)
        .eq('is_active', true)
        .not('size_name', 'is', null);

      if (error) throw error;
      
      const transformedSizes: ProductSize[] = (data || []).map(inv => ({
        size_id: inv.size_variant_id || inv.id,
        size_name: inv.size_name || '',
        size_code: inv.size_name?.substring(0, 2).toUpperCase(),
        stock_quantity: inv.stock_quantity || 0,
        available_stock: (inv.stock_quantity || 0) - (inv.reserved_stock || 0),
        variant_id: inv.id,
        sku: inv.sku,
      }));
      
      setSizes(transformedSizes);
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
