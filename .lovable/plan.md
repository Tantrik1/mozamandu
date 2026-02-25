
# Hide Out-of-Stock Products and Variants

## Overview
Products with 0 stock should be hidden from all customer-facing listings, and individual color/size variants with 0 stock should be hidden on the product detail page.

## Current State
- **ModernProductCard** (customer carousel): Already hides products with 0 stock (`if (productStock === 0) return null`) -- but fetches stock per-card which is expensive
- **HomeProductCard** (homepage sections): No stock check at all -- shows all products regardless of stock
- **ShopProductCard** (shop page): No stock check -- shows all products
- **MixedProducts**: No stock check
- **Shop page fetcher** (`fetchAllProducts`): No stock filtering
- **Homepage fetchers** (`useHomepageData`): No stock filtering
- **ProductDetail page**: Shows all color variants and size variants regardless of individual variant stock
- **customer/LatestProducts**: Hardcodes `stock_quantity: 100` to skip stock checks

## Solution

### 1. Filter out-of-stock products at the data-fetching level (most efficient)

Rather than checking stock per-card (N+1 queries), join `product_inventory` in the fetch queries and filter out products with 0 total available stock.

**Files to change:**

**`src/hooks/useHomepageData.ts`** - All product fetch functions (latestProducts, mostSoldProducts, featuredProducts):
- After fetching products, also fetch their stock from `product_inventory` in a single batch query
- Filter out products where total `available_stock` across active inventory records is 0

**`src/pages/Shop.tsx`** - `fetchAllProducts`:
- Same approach: batch-fetch stock for all products, filter out zero-stock ones

**`src/components/home/MixedProducts.tsx`** - `fetchMixedProducts`:
- Same batch stock filtering

**`src/components/customer/LatestProducts.tsx`** - `fetchLatestProducts`:
- Remove the hardcoded `stock_quantity: 100` hack
- Apply the same stock filtering

### 2. Hide out-of-stock variants on product detail page

**`src/pages/ProductDetail.tsx`**:
- When fetching `color_variants`, also fetch their stock from `product_inventory`
- Filter out color variants where all their inventory records have 0 available stock
- When fetching `size_variants` for a selected color, filter out sizes with 0 available stock

**`src/components/product/ProductInfo.tsx`**:
- The component receives `colorVariants` and `sizeVariants` as props, so filtering at the data level in ProductDetail is sufficient

### 3. Shop page ShopProductCard

**`src/components/shop/ShopProductCard.tsx`**:
- Add stock check similar to ModernProductCard, or better: filter at the Shop page level (approach from step 1) so cards don't need individual queries

## Technical Approach

Create a shared utility function to batch-fetch stock for multiple product IDs:

```typescript
// In stockCalculation.ts
async function getProductsWithStock(productIds: string[]): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('product_inventory')
    .select('product_id, available_stock')
    .in('product_id', productIds)
    .eq('is_active', true);
  
  const stockMap: Record<string, number> = {};
  (data || []).forEach(item => {
    stockMap[item.product_id] = (stockMap[item.product_id] || 0) + (item.available_stock || 0);
  });
  return stockMap;
}
```

Then in each fetch function, after getting products:
```typescript
const stockMap = await getProductsWithStock(products.map(p => p.id));
return products.filter(p => (stockMap[p.id] || 0) > 0);
```

For variants on the detail page:
- Fetch inventory grouped by `color_variant_id` and filter out colors with 0 total stock
- Fetch inventory grouped by `size_variant_id` for the selected color and filter out sizes with 0 stock

## Files Modified

1. **`src/utils/stockCalculation.ts`** -- Add `getBatchProductStock()` utility
2. **`src/hooks/useHomepageData.ts`** -- Filter out zero-stock products in all 3 product fetchers
3. **`src/pages/Shop.tsx`** -- Filter out zero-stock products in `fetchAllProducts`
4. **`src/components/home/MixedProducts.tsx`** -- Filter out zero-stock products
5. **`src/components/customer/LatestProducts.tsx`** -- Remove stock hack, filter properly
6. **`src/pages/ProductDetail.tsx`** -- Filter color variants and size variants with 0 stock
7. **`src/components/shop/ShopProductCard.tsx`** -- No changes needed (filtered at page level)
