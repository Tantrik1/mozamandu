

# Fix Product Deletion: Archive Instead of Hard Delete

## Problem
Product deletion fails because the cascade delete logic encounters foreign key constraint errors across multiple related tables. The current approach tries to hard-delete everything (images, inventory, transactions, order items, variants, and the product itself), which is fragile and data-destructive.

## Solution
Replace hard deletion with a **soft-delete/archive** approach:
1. Instead of deleting the product, set its `status` to `'inactive'`
2. Add an **Active/Inactive tab system** in Product Management so admins can see archived products
3. Allow re-activating archived products
4. Customer-facing pages already filter by `status = 'active'`, so inactive products are automatically hidden

## Changes

### 1. ProductDeletionDialog.tsx -- Replace delete with archive
- Replace `handleDirectDelete()` with `handleArchiveProduct()` that simply updates `products.status` to `'inactive'`
- No need to delete related records (inventory, variants, orders stay intact)
- Update dialog text from "Delete" to "Archive/Deactivate"
- Remove the complex cascade deletion logic entirely

### 2. ProductManagement.tsx -- Add Active/Inactive tabs
- Add a status filter tab (Active / Inactive / All) at the top of the product list
- Default to showing "Active" products
- Show inactive products in a separate tab with a "Reactivate" button
- Change the delete button behavior to trigger archiving
- Add a "Reactivate" action for inactive products that sets status back to `'active'`

### 3. ProductDetailView.tsx -- Update delete action
- The "Delete" button in detail view will also trigger the archive flow (same dialog)
- Show product status prominently (Active/Inactive badge)

## Technical Details

### Archive function (replaces cascade delete)
```typescript
const handleArchiveProduct = async () => {
  const { error } = await supabase
    .from('products')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', productId);
  // Show success toast, call onConfirm()
};
```

### Reactivate function (new)
```typescript
const handleReactivate = async (productId: string) => {
  const { error } = await supabase
    .from('products')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', productId);
  // Refresh product list
};
```

### Product Management tab filtering
- Add `statusFilter` state: `'active' | 'inactive' | 'all'`
- Filter products by status in `filteredProducts`
- Render tabs using existing UI components

### Customer-facing visibility
- All product-fetching queries already filter `.eq('status', 'active')`, so archived products are automatically hidden from the website -- no additional changes needed on the customer side.

## Files Modified

1. **`src/components/admin/ProductDeletionDialog.tsx`** -- Replace cascade delete with simple status update to `'inactive'`; update UI text
2. **`src/components/admin/ProductManagement.tsx`** -- Add Active/Inactive/All tabs; add reactivate button for inactive products; update delete button label to "Archive"
3. **`src/components/admin/ProductDetailView.tsx`** -- Show status badge; update delete button label

