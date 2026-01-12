/**
 * Utility functions for normalizing and working with discount tiers
 * The database uses `discount_percentage` but the frontend expects `discount_amount`
 */

export interface RawDiscountTier {
  id?: string;
  subcategory_id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_percentage?: number;
  discount_amount?: number;
  price_per_unit?: number | null;
  is_active?: boolean;
}

export interface NormalizedDiscountTier {
  id?: string;
  subcategory_id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
  price_per_unit?: number | null;
  is_active?: boolean;
}

/**
 * Normalizes a discount tier from database format to frontend format
 * Maps `discount_percentage` to `discount_amount` for compatibility
 */
export function normalizeDiscountTier(tier: RawDiscountTier): NormalizedDiscountTier {
  return {
    ...tier,
    // Use discount_amount if available, otherwise fall back to discount_percentage
    // If both are undefined/null, default to 0
    discount_amount: tier.discount_amount ?? tier.discount_percentage ?? 0,
  };
}

/**
 * Normalizes an array of discount tiers
 */
export function normalizeDiscountTiers(tiers: RawDiscountTier[]): NormalizedDiscountTier[] {
  return tiers.map(normalizeDiscountTier);
}

/**
 * Groups discount tiers by subcategory ID and normalizes them
 */
export function groupAndNormalizeTiers(
  tiers: RawDiscountTier[]
): { [key: string]: NormalizedDiscountTier[] } {
  const grouped: { [key: string]: NormalizedDiscountTier[] } = {};
  
  tiers.forEach(tier => {
    const subcategoryId = tier.subcategory_id;
    if (!grouped[subcategoryId]) {
      grouped[subcategoryId] = [];
    }
    grouped[subcategoryId].push(normalizeDiscountTier(tier));
  });
  
  return grouped;
}

/**
 * Safely gets the discount amount from a tier, with fallback to 0
 */
export function getDiscountAmount(tier: RawDiscountTier | NormalizedDiscountTier | null | undefined): number {
  if (!tier) return 0;
  const amount = (tier as NormalizedDiscountTier).discount_amount ?? 
                 (tier as RawDiscountTier).discount_percentage ?? 0;
  return isNaN(amount) ? 0 : amount;
}
