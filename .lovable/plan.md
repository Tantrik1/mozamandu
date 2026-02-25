

# Fix: Category/Subcategory Status Not Respected in Product Listings and Search

## Problem

When a category or subcategory is set to inactive (status = 'off'), products belonging to them **still appear** across the entire website. This affects:

- Shop page product grid
- Homepage sections (Latest, Featured, Most Sold, Mixed)
- Global search (desktop and mobile)
- "View all results" search on shop page

Additionally, search results show subcategories whose **parent category is inactive**.

## Root Cause

All product-fetching queries only check `products.status = 'active'` but never verify that the parent subcategory (`status = 'on'`) or grandparent category (`status = 'on'`) is also active. Search queries for subcategories check subcategory status but not parent category status.

## Solution

### 1. Create a shared utility to get active subcategory IDs

Add a helper function that returns only subcategory IDs where both the subcategory AND its parent category are active. This is a single query we can reuse everywhere.

**File:** `src/utils/stockCalculation.ts` (add new export)

```text
getActiveSubcategoryIds() -> string[]
  - Fetch subcategories where status = 'on'
  - Join categories and filter where category status = 'on'
  - Return array of valid subcategory IDs
  - Cache-friendly (called once per page load via React Query)
```

### 2. Filter products in all fetch functions

**Files to change:**
- `src/hooks/useHomepageData.ts` -- fetchLatestProducts, fetchMostSoldProducts, fetchFeaturedProducts
- `src/pages/Shop.tsx` -- fetchAllProducts
- `src/components/home/MixedProducts.tsx` -- fetchMixedProducts
- `src/components/customer/LatestProducts.tsx` -- fetchLatestProducts

In each, after fetching products, filter by checking `product.subcategory_id` is in the active subcategory IDs list. Or better: add `.in('subcategory_id', activeIds)` directly to the Supabase query.

### 3. Fix search to exclude inactive categories/subcategories/products

**Files to change:**
- `src/components/navbar/GlobalSearch.tsx`
- `src/components/navbar/MobileSearch.tsx`

Changes:
- **Subcategory search**: Also verify the parent category has `status = 'on'` (currently only checks subcategory status). Use `!inner` join: `subcategories!inner(... category:categories!inner(...))` with `.eq('category.status', 'on')`.
- **Product search**: Filter products whose subcategory is active. Fetch active subcategory IDs first, then add `.in('subcategory_id', activeIds)` to the product query.

### 4. Filter in CategorySubcategoryBar

**File:** `src/components/shop/CategorySubcategoryBar.tsx`

Already filters by `status = 'on'` for both categories and subcategories -- no change needed here.

## Technical Details

### New utility function

```typescript
// src/utils/stockCalculation.ts
export const getActiveSubcategoryIds = async (): Promise<string[]> => {
  const { data } = await supabase
    .from('subcategories')
    .select('id, category:categories!inner(status)')
    .eq('status', 'on')
    .eq('categories.status', 'on');
  return (data || []).map(s => s.id);
};
```

### Updated fetch pattern (example: fetchAllProducts)

```typescript
const fetchAllProducts = async () => {
  const activeSubIds = await getActiveSubcategoryIds();
  if (activeSubIds.length === 0) return [];
  
  const { data } = await supabase
    .from('products')
    .select('...')
    .eq('status', 'active')
    .in('subcategory_id', activeSubIds)
    .order('created_at', { ascending: false });
  // ... stock filtering continues as before
};
```

### Updated search pattern (example: GlobalSearch product query)

```typescript
const activeSubIds = await getActiveSubcategoryIds();

// Products - only from active subcategories
const { data: products } = await supabase
  .from('products')
  .select('id, name, image_url, selling_price, subcategory:subcategories(name)')
  .eq('status', 'active')
  .in('subcategory_id', activeSubIds)
  .ilike('name', searchTerm)
  .limit(8);

// Subcategories - only those with active parent category
const { data: subcategories } = await supabase
  .from('subcategories')
  .select('id, name, image_url, category:categories!inner(name)')
  .eq('status', 'on')
  .eq('categories.status', 'on')
  .ilike('name', searchTerm)
  .limit(5);
```

## Files Modified

1. `src/utils/stockCalculation.ts` -- Add `getActiveSubcategoryIds()` utility
2. `src/hooks/useHomepageData.ts` -- Filter all 3 product fetchers by active subcategories
3. `src/pages/Shop.tsx` -- Filter `fetchAllProducts` by active subcategories
4. `src/components/home/MixedProducts.tsx` -- Filter by active subcategories
5. `src/components/customer/LatestProducts.tsx` -- Filter by active subcategories
6. `src/components/navbar/GlobalSearch.tsx` -- Filter products and subcategories by active status
7. `src/components/navbar/MobileSearch.tsx` -- Same search fixes

