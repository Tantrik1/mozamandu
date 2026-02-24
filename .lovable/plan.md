

# Fix: Variant Deletion Still Failing on FK Constraint

## Root Cause (Confirmed)

The current code tries to:
1. Nullify `product_inventory_id` in `order_item_details` 
2. Then delete `product_inventory`

Step 1 **silently fails** -- the Supabase client returns no error when an UPDATE affects 0 rows due to RLS restrictions. So step 2 hits the FK constraint and throws.

## Solution: Soft-Delete Instead of Hard-Delete

Instead of trying to delete `product_inventory` records (which requires clearing ALL FK references from order history tables), **soft-delete** them:
- Set `is_active = false` on the inventory records
- Nullify `color_variant_id` and `size_variant_id` to unlink them from the variants being deleted
- Then delete `size_variants` and `color_variants` as before

This completely avoids touching `order_item_details` or `customer_order_item_details`.

## Technical Changes

**File:** `src/components/admin/EnhancedProductVariantForm.tsx`

Replace `cleanupAndDeleteInventory` with a `softDeleteInventory` function that:
1. Updates matching `product_inventory` records: `is_active = false`, `color_variant_id = null`, `size_variant_id = null`
2. Deletes `inventory_transactions` for those records (these have no downstream FKs)
3. Proceeds to delete `size_variants` and `color_variants` normally

The deletion order becomes:
```text
1. Soft-delete product_inventory (set is_active=false, nullify variant IDs)
2. Delete inventory_transactions (optional cleanup, no FK issues)
3. Delete size_variants
4. Delete color_variants
```

This is safer because:
- Order history references remain intact (no nullification needed)
- Inventory records become inactive orphans (harmless)
- No FK constraints are violated

