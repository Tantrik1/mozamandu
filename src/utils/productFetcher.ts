
import { supabase } from '@/integrations/supabase/client';

export interface ProductVariant {
  id: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: {
    id: string;
    size_name: string;
    size_code?: string;
  }[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price?: number;
  image_url?: string;
  status: string;
  subcategory_id: string;
  is_featured?: boolean;
  has_color_variants?: boolean;
  color_has_size_variants?: boolean;
  subcategories: {
    name: string;
    selling_price: number;
    minimum_quantity: number;
  };
  color_variants?: ProductVariant[];
}

export async function fetchProductsWithVariants(options: {
  subcategoryId?: string;
  featuredOnly?: boolean;
  limit?: number;
  status?: 'active' | 'inactive';
} = {}): Promise<Product[]> {
  try {
    console.log('Fetching products with options:', options);
    
    // Build the base query
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        cost_price,
        selling_price,
        image_url,
        status,
        subcategory_id,
        is_featured,
        has_color_variants,
        color_has_size_variants,
        subcategories!products_subcategory_id_fkey (
          name,
          selling_price,
          minimum_quantity
        )
      `)
      .eq('status', options.status || 'active')
      .order('created_at', { ascending: false });

    // Apply filters
    if (options.subcategoryId) {
      query = query.eq('subcategory_id', options.subcategoryId);
    }

    if (options.featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data: productsData, error: productsError } = await query;

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    if (!productsData || productsData.length === 0) {
      console.log('No products found with given criteria');
      return [];
    }

    console.log('Products fetched:', productsData.length);

    // Fetch variants for each product
    const productsWithVariants: Product[] = [];
    
    for (const product of productsData) {
      let productWithVariants: Product = { 
        ...product, 
        color_variants: [] 
      };

      if (product.has_color_variants) {
        // Get color variants for this product
        const { data: colorVariants, error: colorError } = await supabase
          .from('color_variants')
          .select(`
            id,
            color_name,
            image_url,
            has_sizes
          `)
          .eq('product_id', product.id);

        if (colorError) {
          console.error('Error fetching color variants for product:', product.id, colorError);
        } else if (colorVariants) {
          // For each color variant, get size variants if they exist
          const colorVariantsWithSizes: ProductVariant[] = [];
          
          for (const colorVariant of colorVariants) {
            let colorWithSizes: ProductVariant = { 
              ...colorVariant, 
              size_variants: [] 
            };

            if (colorVariant.has_sizes) {
              const { data: sizeVariants, error: sizeError } = await supabase
                .from('size_variants')
                .select(`
                  id,
                  size_name,
                  size_code
                `)
                .eq('color_variant_id', colorVariant.id);

              if (sizeError) {
                console.error('Error fetching size variants for color:', colorVariant.id, sizeError);
              } else if (sizeVariants) {
                colorWithSizes.size_variants = sizeVariants;
              }
            }

            colorVariantsWithSizes.push(colorWithSizes);
          }

          productWithVariants.color_variants = colorVariantsWithSizes;
        }
      }

      productsWithVariants.push(productWithVariants);
    }

    console.log('Products with variants processed:', productsWithVariants.length);
    return productsWithVariants;
  } catch (error) {
    console.error('Error in fetchProductsWithVariants:', error);
    throw error;
  }
}

// Specific fetch functions for different use cases
export const fetchAllProducts = () => fetchProductsWithVariants();

export const fetchFeaturedProducts = (limit?: number) => 
  fetchProductsWithVariants({ featuredOnly: true, limit });

export const fetchLatestProducts = (limit: number = 8) => 
  fetchProductsWithVariants({ limit });

export const fetchSubcategoryProducts = (subcategoryId: string) => 
  fetchProductsWithVariants({ subcategoryId });
