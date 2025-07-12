
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
          console.log('🔄 Cart is empty, clearing combo');
          setActiveCombo(null);
          setPreviousComboId(null);
        }
        return;
      }

      console.log('🔍 Checking combo eligibility...');
      console.log('📦 Cart items:', cartItems.length);
      console.log('📦 Cart details:', cartItems.map(item => ({
        name: item.productName,
        subcategoryId: item.subcategoryId,
        quantity: item.quantity
      })));

      const { data: combos, error: combosError } = await supabase
        .from('combos')
        .select(`
          id,
          name,
          description,
          status,
          combo_subcategories (
            subcategory_id,
            min_units,
            price
          )
        `)
        .eq('status', 'active');

      if (combosError) {
        console.error('❌ Error fetching combos:', combosError);
        return;
      }

      console.log('📋 Available active combos:', combos?.length || 0);
      console.log('📋 Combo details:', combos);

      // Calculate subcategory quantities
      const subcategoryCounts: { [key: string]: number } = {};
      for (const cartItem of cartItems) {
        const subcategoryId = cartItem.subcategoryId;
        subcategoryCounts[subcategoryId] = (subcategoryCounts[subcategoryId] || 0) + cartItem.quantity;
      }

      console.log('📊 Subcategory counts in cart:', subcategoryCounts);

      // Get subcategory names for better debugging
      const subcategoryIds = Object.keys(subcategoryCounts);
      if (subcategoryIds.length > 0) {
        const { data: subcategoryNames } = await supabase
          .from('subcategories')
          .select('id, name')
          .in('id', subcategoryIds);
        
        if (subcategoryNames) {
          const nameMap = subcategoryNames.reduce((acc, sub) => {
            acc[sub.id] = sub.name;
            return acc;
          }, {} as { [key: string]: string });
          
          console.log('📝 Cart subcategories with names:', 
            Object.entries(subcategoryCounts).map(([id, count]) => ({
              id,
              name: nameMap[id] || 'Unknown',
              count
            }))
          );
        }
      }

      let newActiveCombo: ComboData | null = null;
      
      // Check each combo for eligibility
      for (const combo of combos || []) {
        console.log(`🎯 Checking combo: "${combo.name}" (ID: ${combo.id})`);
        console.log(`📋 Combo requirements:`, combo.combo_subcategories);
        
        let isEligible = true;
        const missingRequirements: string[] = [];
        const metRequirements: string[] = [];
        
        for (const comboSubcategory of combo.combo_subcategories) {
          const requiredUnits = comboSubcategory.min_units;
          const availableUnits = subcategoryCounts[comboSubcategory.subcategory_id] || 0;
          
          console.log(`📏 Subcategory ${comboSubcategory.subcategory_id}: needs ${requiredUnits}, has ${availableUnits}`);
          
          if (availableUnits >= requiredUnits) {
            metRequirements.push(`✅ Subcategory ${comboSubcategory.subcategory_id}: has ${availableUnits}/${requiredUnits}`);
          } else {
            isEligible = false;
            missingRequirements.push(`❌ Subcategory ${comboSubcategory.subcategory_id}: needs ${requiredUnits}, has ${availableUnits} (missing ${requiredUnits - availableUnits})`);
          }
        }

        console.log('Met requirements:', metRequirements);
        if (missingRequirements.length > 0) {
          console.log('Missing requirements:', missingRequirements);
        }

        if (isEligible) {
          console.log(`✅ COMBO ELIGIBLE: "${combo.name}"`);
          newActiveCombo = combo;
          break; // Take the first eligible combo
        } else {
          console.log(`❌ Combo "${combo.name}" NOT eligible`);
        }
      }

      // Handle combo state changes and notifications
      if (newActiveCombo && (!activeCombo || activeCombo.id !== newActiveCombo.id)) {
        // New combo activated
        console.log(`🎉 ACTIVATING COMBO: ${newActiveCombo.name}`);
        toast({
          title: "🎉 Combo Applied!",
          description: `${newActiveCombo.name}: ${newActiveCombo.description}`,
          duration: 4000,
        });
        setActiveCombo(newActiveCombo);
        setPreviousComboId(newActiveCombo.id);
      } else if (activeCombo && !newActiveCombo) {
        // Combo lost
        console.log('💔 Combo lost');
        toast({
          title: "💰 Normal Pricing Applied",
          description: "Combo requirements no longer met. Add more items to reactivate combo pricing.",
          duration: 3000,
        });
        setActiveCombo(null);
        setPreviousComboId(null);
      } else if (!newActiveCombo && !activeCombo) {
        // No combo, maintain state
        console.log('🚫 No combo eligible');
        setActiveCombo(null);
      } else {
        // Same combo still active, no notification needed
        console.log(`✨ Combo "${newActiveCombo?.name}" still active`);
        setActiveCombo(newActiveCombo);
      }

    } catch (error) {
      console.error('💥 Error checking combo eligibility:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 useComboManager useEffect triggered, cart items:', cartItems.length);
    checkComboEligibility();
  }, [cartItems]);

  const isComboActive = (subcategoryId: string): boolean => {
    if (!activeCombo) return false;
    const isActive = activeCombo.combo_subcategories.some(cs => cs.subcategory_id === subcategoryId);
    console.log(`🎯 isComboActive(${subcategoryId}):`, isActive);
    return isActive;
  };

  const getComboPrice = (subcategoryId: string): number | null => {
    if (!activeCombo) return null;
    const comboSubcategory = activeCombo.combo_subcategories.find(
      cs => cs.subcategory_id === subcategoryId
    );
    const price = comboSubcategory ? comboSubcategory.price : null;
    console.log(`🎯 getComboPrice(${subcategoryId}):`, price);
    return price;
  };

  // Function to check if minimum quantity requirements should be ignored
  const shouldIgnoreMinimumQuantity = (subcategoryId: string): boolean => {
    const ignore = isComboActive(subcategoryId);
    console.log(`🎯 shouldIgnoreMinimumQuantity(${subcategoryId}):`, ignore);
    return ignore;
  };

  return {
    activeCombo,
    isComboActive,
    getComboPrice,
    shouldIgnoreMinimumQuantity,
    checkComboEligibility
  };
}
