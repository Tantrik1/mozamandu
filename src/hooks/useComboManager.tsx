
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ComboSubcategory {
  id: string;
  combo_id: string;
  subcategory_id: string;
  min_units: number;
  price: number;
  subcategories: {
    id: string;
    name: string;
  };
}

interface Combo {
  id: string;
  name: string;
  description: string | null;
  status: string;
  combo_subcategories: ComboSubcategory[];
}

export function useComboManager() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCombos();
  }, []);

  const fetchCombos = async () => {
    try {
      const { data, error } = await supabase
        .from('combos')
        .select(`
          *,
          combo_subcategories(
            *,
            subcategories(id, name)
          )
        `)
        .eq('status', 'active');

      if (error) throw error;
      setCombos(data || []);
    } catch (error) {
      console.error('Error fetching combos:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkComboEligibility = (cartItems: any[]) => {
    if (!combos.length || !cartItems.length) return null;

    // Group cart items by subcategory
    const subcategoryQuantities: { [key: string]: number } = {};
    
    cartItems.forEach(item => {
      const subcategoryId = item.product?.subcategory_id;
      if (subcategoryId) {
        subcategoryQuantities[subcategoryId] = (subcategoryQuantities[subcategoryId] || 0) + item.quantity;
      }
    });

    // Check each combo for eligibility
    for (const combo of combos) {
      let isEligible = true;
      
      for (const comboSubcat of combo.combo_subcategories) {
        const availableQuantity = subcategoryQuantities[comboSubcat.subcategory_id] || 0;
        
        // If combo is applied, minimum requirement should be ignored
        // This fixes the checkout issue mentioned by the user
        if (availableQuantity === 0) {
          isEligible = false;
          break;
        }
      }
      
      if (isEligible) {
        return combo;
      }
    }

    return null;
  };

  const applyComboToCart = (cartItems: any[], combo: Combo) => {
    if (!combo) return cartItems;

    return cartItems.map(item => {
      const subcategoryId = item.product?.subcategory_id;
      const comboSubcat = combo.combo_subcategories.find(cs => cs.subcategory_id === subcategoryId);
      
      if (comboSubcat) {
        return {
          ...item,
          comboPrice: comboSubcat.price,
          isComboApplied: true
        };
      }
      
      return item;
    });
  };

  return {
    combos,
    loading,
    checkComboEligibility,
    applyComboToCart,
    refetch: fetchCombos
  };
}
