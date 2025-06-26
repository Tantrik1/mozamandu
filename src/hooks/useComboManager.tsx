
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
  image_url?: string;
}

interface ComboData {
  id: string;
  name: string;
  description: string;
  combo_subcategories: {
    subcategory_id: string;
    min_units: number;
    price: number;
  }[];
}

interface UseComboManagerProps {
  cartItems: CartItem[];
}

export function useComboManager({ cartItems }: UseComboManagerProps) {
  const [combos, setCombos] = useState<ComboData[]>([]);
  const [activeCombo, setActiveCombo] = useState<ComboData | null>(null);

  useEffect(() => {
    fetchCombos();
  }, []);

  useEffect(() => {
    checkForActiveCombo();
  }, [cartItems, combos]);

  const fetchCombos = async () => {
    try {
      const { data, error } = await supabase
        .from('combos')
        .select(`
          id,
          name,
          description,
          combo_subcategories (
            subcategory_id,
            min_units,
            price
          )
        `)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching combos:', error);
        return;
      }

      setCombos(data || []);
    } catch (error) {
      console.error('Error fetching combos:', error);
    }
  };

  const checkForActiveCombo = () => {
    if (cartItems.length === 0 || combos.length === 0) {
      setActiveCombo(null);
      return;
    }

    // Group cart items by subcategory
    const subcategoryQuantities = cartItems.reduce((acc, item) => {
      acc[item.subcategoryId] = (acc[item.subcategoryId] || 0) + item.quantity;
      return acc;
    }, {} as { [key: string]: number });

    // Find the best applicable combo
    let bestCombo: ComboData | null = null;
    let bestComboScore = 0;

    for (const combo of combos) {
      let comboScore = 0;
      let allRequirementsMet = true;

      for (const comboSubcategory of combo.combo_subcategories) {
        const availableQuantity = subcategoryQuantities[comboSubcategory.subcategory_id] || 0;
        
        if (availableQuantity >= comboSubcategory.min_units) {
          comboScore += availableQuantity;
        } else {
          allRequirementsMet = false;
          break;
        }
      }

      if (allRequirementsMet && comboScore > bestComboScore) {
        bestCombo = combo;
        bestComboScore = comboScore;
      }
    }

    setActiveCombo(bestCombo);
  };

  return {
    activeCombo,
    combos
  };
}
