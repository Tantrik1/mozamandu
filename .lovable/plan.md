
# Fix: Variant Deletion Fails Due to Foreign Key Constraints

## Root Cause

The external database has foreign key constraints that the current deletion code doesn't account for. Specifically, when trying to delete a `product_inventory` record, these tables may reference it:

1. `inventory_transactions.inventory_id` references `product_inventory.id`
2. `order_item_details.product_inventory_id` references `product_inventory.id`
3. `customer_order_item_details.product_inventory_id` references `product_inventory.id`

The current code tries to delete `product_inventory` records first, but those deletes silently fail because `inventory_transactions` (and possibly order item details) still reference them. Then `size_variants` and `color_variants` deletes also fail because `product_inventory` still references them.

The errors are only logged to console, not thrown, so the save appears to "succeed" but nothing is actually deleted. When the page refreshes, the variants reappear.

## Fix

Update `handleDeletions` in `EnhancedProductVariantForm.tsx` to delete in the correct order respecting ALL foreign key dependencies:

```text
Deletion order for each color variant:
1. Get all product_inventory IDs for this color
2. Delete inventory_transactions referencing those inventory IDs
3. Nullify order_item_details.product_inventory_id (can't delete order history)
4. Nullify customer_order_item_details.product_inventory_id
5. Delete product_inventory records
6. Delete size_variants
7. Delete color_variants
```

For individual size variant deletion, the same chain applies but scoped to a single size.

Additionally, all error checks will THROW instead of just logging, so failures are visible to the user.

## Technical Details

**File:** `src/components/admin/EnhancedProductVariantForm.tsx`

The `handleDeletions` function (lines 495-566) will be rewritten to:
- Fetch inventory IDs for the variant being deleted
- Delete `inventory_transactions` by those inventory IDs
- SET NULL on `order_item_details.product_inventory_id` and `customer_order_item_details.product_inventory_id` (preserves order history while removing the FK reference)
- Then proceed with the existing deletion chain (inventory, sizes, colors)
- Throw errors instead of only logging them
