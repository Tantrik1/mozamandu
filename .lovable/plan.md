## Root cause found — one bug explains everything

I ran a real insert against `product_inventory` on the live database. It returned:

```
code: 428C9
message: cannot insert a non-DEFAULT value into column "available_stock"
details: Column "available_stock" is a generated column.
```

`available_stock` is a **generated column** in the database (`stock_quantity - reserved_stock`, auto-computed by Postgres). The last round of fixes started writing `available_stock` explicitly in every insert/update — which the database rejects. **Every** inventory write since then has been silently failing:

- Elite Backpack save → fails → no `product_inventory` rows exist → storefront sums 0 → hidden.
- Inline stock edits in `InventoryEditDialog` → fail.
- Bulk edits in `InventoryManagementPopup` → the "Failed to save inventory records" toast in the user's screenshot.
- `reserveStock` / `releaseStock` / `fulfillOrder` in `useInventoryManager` → fail on every checkout.
- Archive flow that zeroes stock → the `available_stock: 0` line fails.

Also confirmed via query: the earlier concern about "stale `available_stock`" was wrong — there are **zero** rows in the DB where `stock_quantity > 0 AND available_stock = 0`. The column is correct because Postgres maintains it.

## Fix

Remove every explicit write to `available_stock` (it's DB-generated). Files:

1. **`src/components/admin/InventoryManagementPopup.tsx`** — drop `available_stock` from `inventoryData` at line 254.
2. **`src/components/inventory/InventoryEditDialog.tsx`** — drop `available_stock` from the update payload (lines 59–64).
3. **`src/hooks/useInventoryManager.ts`** — drop `available_stock` from the update payloads in `reserveStock`, `releaseStock`, and `fulfillOrder`. Only write `stock_quantity` and `reserved_stock`; the DB recomputes.
4. **`src/components/admin/ProductDeletionDialog.tsx`** — drop `available_stock: 0` from the archive update payload (keep `stock_quantity: 0`, `reserved_stock: 0`, `is_active: false`).
5. **Sanity-scan every other `.update({ ... available_stock` and `.insert({ ... available_stock`** in the repo and remove them.

Reading `available_stock` (in stockCalculation, cart, checkout, shop grid, etc.) stays unchanged — that's fine and correct.

## After the write fix, re-attempt the Elite Backpack save

Once the write path works, the user can hit **Save Inventory** in the popup they screenshotted and both variants (Red = 40, Blue = 10) will actually persist. Verify with a live query that two rows now exist for `product_id = ad5631e1-…`.

## The other issues the user raised

They're real, but almost all of them were symptoms of the same failed-writes bug:

- **Inactive products keep old inventory** — the archive flow was writing `available_stock: 0` and silently erroring, so `is_active`/`stock_quantity`/`reserved_stock` never got updated either. Removing `available_stock` from the archive payload fixes this going forward. For rows already stuck this way, add a small **Admin → Maintenance** button that runs a one-shot repair: for every product with `status='inactive'`, set its `product_inventory` rows to `is_active=false, stock_quantity=0, reserved_stock=0` (no `available_stock` — DB handles it).
- **Repurposed product carries old stock** — same story. Once archive actually zeroes stock, the "rename an inactive product into a new product" workflow starts clean.
- **Renamed product still shows in inventory dashboard** — the dashboard already filters `products.status='active'` and `is_active=true`. After the archive fix works, the rows disappear naturally.

## Out of scope for this turn (log so we don't lose them)

- Guaranteed inventory upsert when adding a new variant (separate audit of `EnhancedProductVariantForm`).
- Reactivate button restoring inventory rows.
- Storefront hard-filter on `products.status='active'` in every fetcher.

I'll tackle these in a follow-up plan once the write-path fix is verified live — no point stacking more changes on a broken foundation.

## Verification plan

1. Apply the 4 file edits above.
2. Reload admin, open Nike Elite Backpack inventory popup, hit **Save Inventory**.
3. Query `product_inventory?product_id=eq.ad5631e1-…` — expect 2 rows with `available_stock` correctly showing 40 and 10.
4. Archive a test product → confirm its inventory rows now have `stock_quantity=0, is_active=false` and disappear from the dashboard.
5. Place a test order → confirm `reserved_stock` moves and `available_stock` updates automatically.