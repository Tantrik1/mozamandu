import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('status', 'on')
    .order('name');
  if (error) throw error;
  return data || [];
};

const fetchSubcategories = async (): Promise<Subcategory[]> => {
  const { data, error } = await supabase
    .from('subcategories')
    .select('id, name, category_id')
    .eq('status', 'on')
    .order('name');
  if (error) throw error;
  return data || [];
};

/**
 * Cached hook for categories and subcategories used in product forms.
 * Data is cached for 5 minutes to avoid redundant Supabase queries
 * on every form mount.
 */
export function useProductFormData() {
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['admin-subcategories'],
    queryFn: fetchSubcategories,
    staleTime: 5 * 60 * 1000,
  });

  return {
    categories,
    subcategories,
    isLoading: categoriesLoading || subcategoriesLoading,
  };
}
