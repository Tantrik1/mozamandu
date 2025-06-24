
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const [activeCombo, setActiveCombo] = useState<ComboData | null>(null);
  const [previousComboId, setPreviousComboId] = useState<string | null>(null);

  const checkComboEligibility = async () => {
    try {
      if (cartItems.length === 0) {
        if (activeCombo) {
          setActiveCombo(null);
          setPreviousComboId(null);
        }
        return;
      }

      const { data: combos, error: combosError } = await supabase
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

      if (combosError) {
        console.error('Error fetching combos:', combosError);
        return;
      }

      // Calculate subcategory quantities
      const subcategoryCounts: { [key: string]: number } = {};
      for (const cartItem of cartItems) {
        const subcategoryId = cartItem.subcategoryId;
        subcategoryCounts[subcategoryId] = (subcategoryCounts[subcategoryId] || 0) + cartItem.quantity;
      }

      let newActiveCombo: ComboData | null = null;
      
      // Check each combo for eligibility
      for (const combo of combos || []) {
        let isEligible = true;
        
        for (const comboSubcategory of combo.combo_subcategories) {
          const requiredUnits = comboSubcategory.min_units;
          const availableUnits = subcategoryCounts[comboSubcategory.subcategory_id] || 0;
          
          if (availableUnits < requiredUnits) {
            isEligible = false;
            break;
          }
        }

        if (isEligible) {
          newActiveCombo = combo;
          break; // Take the first eligible combo
        }
      }

      // Handle combo state changes and notifications
      if (newActiveCombo && (!activeCombo || activeCombo.id !== newActiveCombo.id)) {
        // New combo activated
        toast({
          title: "🎉 Combo Applied!",
          description: `${newActiveCombo.name}: ${newActiveCombo.description}`,
          duration: 4000,
        });
        setActiveCombo(newActiveCombo);
        setPreviousComboId(newActiveCombo.id);
      } else if (activeCombo && !newActiveCombo) {
        // Combo lost
        toast({
          title: "💰 Normal Pricing Applied",
          description: "Combo requirements no longer met. Add more items to reactivate combo pricing.",
          duration: 3000,
        });
        setActiveCombo(null);
        setPreviousComboId(null);
      } else if (!newActiveCombo && !activeCombo) {
        // No combo, maintain state
        setActiveCombo(null);
      } else {
        // Same combo still active, no notification needed
        setActiveCombo(newActiveCombo);
      }

    } catch (error) {
      console.error('Error checking combo eligibility:', error);
    }
  };

  useEffect(() => {
    checkComboEligibility();
  }, [cartItems]);

  const isComboActive = (subcategoryId: string): boolean => {
    if (!activeCombo) return false;
    return activeCombo.combo_subcategories.some(cs => cs.subcategory_id === subcategoryId);
  };

  const getComboPrice = (subcategoryId: string): number | null => {
    if (!activeCombo) return null;
    const comboSubcategory = activeCombo.combo_subcategories.find(
      cs => cs.subcategory_id === subcategoryId
    );
    return comboSubcategory ? comboSubcategory.price : null;
  };

  return {
    activeCombo,
    isComboActive,
    getComboPrice,
    checkComboEligibility
  };
}
