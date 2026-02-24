

# Product Management Bug Report and Fix Plan

## Bug Report: Identified Issues

### BUG 1: Dual Save Paths Create Conflicting Product Updates
**Severity: Critical**

When a product has variants, there are TWO separate save mechanisms:
- The main `EditProductForm` has its own `onSubmit` that updates the product via the form's submit button
- The `EnhancedProductVariantForm` has its own `handleSave` that ALSO updates the product via `updateProductInformation()`

When variant mode is active, the form's submit button is hidden, and only the variant form's "Save Variants & Manage Inventory" button is shown. However, the `EnhancedProductVariantForm` receives product data via `getProductData()` which does NOT include SEO fields, care instructions, material composition, or image data properly -- it uses its own separate image upload logic that skips WebP optimization.

**Impact:** SEO fields, care instructions, and material composition are silently lost when saving a product with variants. Image uploads skip optimization.

---

### BUG 2: Inventory Records Not Cleaned Up When Variants Are Deleted
**Severity: Critical**

In `EnhancedProductVariantForm.handleDeletions()`, when deleting a color variant, it deletes inventory by `color_variant_id`. But it does NOT delete size variant records BEFORE deleting the color variant. The code comment says "will cascade to size variants" but there are NO foreign key cascade constraints defined in the database (confirmed: no foreign keys listed for `size_variants` or `color_variants` tables).

**Impact:** Orphaned `size_variants` records remain in the database after color variant deletion if the delete order is wrong. The size variants deletion loop runs first which helps, but only for variants explicitly marked `toDelete` -- sizes belonging to a deleted color that weren't individually marked are orphaned.

---

### BUG 3: SKU Regeneration on Every Inventory Popup Open
**Severity: High**

In `InventoryManagementPopup.generateVariantInventory()`, when an existing inventory record is NOT found for a color+size combination (e.g., if the match fails), a NEW SKU is generated. The matching logic uses exact `color_variant_id` and `size_variant_id` equality. If a variant was deleted and re-created (gets a new ID), the old inventory record becomes orphaned and a new one with a fresh SKU is created.

**Impact:** SKUs change unexpectedly, old inventory records are orphaned, and stock quantities are reset to 0.

---

### BUG 4: Stale Inventory Records After Product Name/Category Changes
**Severity: Medium**

The `product_inventory` table stores denormalized fields: `product_name`, `category_name`, `subcategory_name`, `color_name`, `size_name`. These are only updated when the inventory popup is opened and saved. If a product name or category changes but inventory is never re-saved, these fields become stale.

**Impact:** Inventory reports and searches show outdated product/category names.

---

### BUG 5: Product Deletion Doesn't Delete `product_faqs` or `blog_products`
**Severity: Medium**

In `ProductDeletionDialog.handleDirectDelete()`, the deletion sequence handles: product_images, inventory_transactions, customer_order_item_details, order_item_details, customer_order_items, order_items, product_inventory, size_variants, color_variants, and the product itself. But it does NOT delete:
- `product_faqs` (references product_id)
- `blog_products` (references product_id)
- `product_reviews` (references product_id)

**Impact:** Deletion fails with foreign key constraint errors if the product has FAQs, blog associations, or reviews.

---

### BUG 6: `markColorVariantForDeletion` Index Mismatch After Filtering
**Severity: Medium**

The variant form renders only non-deleted variants using `.filter(v => !v.toDelete)` but passes the filtered array index to `markColorVariantForDeletion()`. This means the index in the rendered list doesn't match the index in the full `colorVariants` array, so the wrong variant could be deleted.

**Impact:** Clicking delete on a color variant after another has been marked for deletion targets the wrong variant.

---

### BUG 7: No Validation Before Saving Variants
**Severity: Medium**

`EnhancedProductVariantForm.handleSave()` doesn't validate that:
- Color names are not empty
- Color names are unique within the product
- Size names are not empty or duplicated within a color
- At least one active variant exists

**Impact:** Empty or duplicate variants can be saved, causing confusion in inventory and customer-facing pages.

---

### BUG 8: `available_stock` Column Updated Directly in Edit Dialog
**Severity: Low (already handled)**

`InventoryEditDialog` correctly excludes `available_stock` from updates since it's a generated column. However, the `InventoryManagementPopup.saveInventory()` doesn't include `reserved_stock` in updates, which could cause the generated `available_stock` to show incorrect values if `reserved_stock` exists.

---

## Implementation Plan

### Phase 1: Fix Critical Save Path Issues (Bug 1)

**Files to modify:** `src/components/admin/EnhancedProductVariantForm.tsx`, `src/components/admin/EditProductForm.tsx`

1. Update `ProductData` interface in `EnhancedProductVariantForm` to include ALL product fields (SEO, care instructions, material composition, og fields)
2. Update `getProductData()` in `EditProductForm` to pass ALL form values including SEO and care instructions
3. Update `updateProductInformation()` in `EnhancedProductVariantForm` to save all fields (care instructions as array, meta_keywords as array)
4. Use the same WebP image optimization in `EnhancedProductVariantForm.uploadImageAndGetUrl()` as `EditProductForm`

### Phase 2: Fix Variant Deletion Cascade (Bugs 2, 6)

**Files to modify:** `src/components/admin/EnhancedProductVariantForm.tsx`

1. Fix `handleDeletions()` to delete ALL size variants belonging to a color variant being deleted (not just those marked `toDelete`)
2. Fix the index mismatch by tracking variants by ID/key rather than array index in the render loop
3. Pass the actual variant object or use a stable identifier when calling deletion functions

### Phase 3: Fix Product Deletion (Bug 5)

**Files to modify:** `src/components/admin/ProductDeletionDialog.tsx`

Add deletion steps for:
1. `product_faqs` (delete where product_id matches)
2. `blog_products` (delete where product_id matches)  
3. `product_reviews` (delete where product_id matches)

These should be added BEFORE the product_inventory deletion step.

### Phase 4: Fix Inventory Sync Issues (Bugs 3, 4)

**Files to modify:** `src/components/admin/InventoryManagementPopup.tsx`

1. When matching existing inventory records to variants, also try matching by `color_name + size_name` as a fallback when `color_variant_id` doesn't match (handles re-created variants)
2. Add logic to update denormalized fields (`product_name`, `category_name`, etc.) whenever the inventory popup opens, even for existing records
3. Preserve existing `reserved_stock` when updating inventory records

### Phase 5: Add Variant Validation (Bug 7)

**Files to modify:** `src/components/admin/EnhancedProductVariantForm.tsx`

1. Before `handleSave()`, validate:
   - All active color variants have non-empty names
   - No duplicate color names within the product
   - All active size variants have non-empty names
   - No duplicate size names within a color
2. Show clear error messages for validation failures

### Technical Details

**Database note:** This project uses an external database (huwhbxjlyucamitwwhyg.supabase.co) that cannot be modified via migrations. All fixes are frontend/application-level code changes only. No schema changes are needed -- all fixes address application logic.

**Files to be modified (summary):**
- `src/components/admin/EnhancedProductVariantForm.tsx` -- Phases 1, 2, 5
- `src/components/admin/EditProductForm.tsx` -- Phase 1
- `src/components/admin/ProductDeletionDialog.tsx` -- Phase 3
- `src/components/admin/InventoryManagementPopup.tsx` -- Phase 4

**Estimated changes:** ~200 lines modified/added across 4 files.

