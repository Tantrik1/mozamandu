

# Desktop-Only Left Sidebar with Real-Time Search for Shop Page

## What Changes

Add a sticky left-hand filter sidebar visible only on desktop (lg+ breakpoints). It includes a real-time search input that starts filtering after 2 characters, plus the existing category/subcategory, color, and price filters. The mobile layout (CategorySubcategoryBar, FilterBottomSheet, SortBottomSheet) remains completely untouched.

## How It Works

### Layout Change in Shop.tsx
- Wrap the product grid area in a `flex` container with `hidden lg:flex` for a two-column layout on desktop
- Left column: new `DesktopShopSidebar` component (~260px wide, sticky)
- Right column: existing product grid (takes remaining space)
- Mobile continues to render the current single-column layout with the CategorySubcategoryBar and bottom sheets as-is

### New Component: DesktopShopSidebar
**File:** `src/components/shop/DesktopShopSidebar.tsx`

A desktop-only sidebar containing:

1. **Real-time Search** (top of sidebar)
   - Input field with search icon
   - Filters products as the user types, starting from 2 characters
   - Debounced (300ms) to avoid excessive re-renders
   - Updates the same `localSearch` / `searchQuery` state already used in Shop.tsx
   - Shows "Type 2+ characters to search" hint when input has 1 character
   - Clear button (X) when search is active

2. **Sort Dropdown**
   - A select/dropdown for sort options (Best Sellers, Newest, Price Low-High, Price High-Low, Name)
   - Replaces the need for SortBottomSheet on desktop

3. **Categories with Subcategories** (expandable tree)
   - Reuses the same pattern from existing `ShopFilters` component
   - Click category to filter + expand subcategories
   - Click subcategory to further narrow

4. **Color Filter** (color dots)
   - Shows available colors based on current product set
   - Toggle to select/deselect

5. **Price Range** (min/max inputs + apply)
   - Same price filter logic as existing

6. **Clear All Filters** button at top when any filter is active

### Changes to Shop.tsx

```text
Current layout (simplified):
  <CategorySubcategoryBar />        (stays for mobile)
  <div className="max-w-7xl ...">
    <header + search>               (stays for mobile)
    <FilterSummaryStrip />
    <product grid>
  </div>
  <FilterBottomSheet />             (stays for mobile)
  <SortBottomSheet />               (stays for mobile)

New layout:
  <CategorySubcategoryBar />        (add className="lg:hidden" -- hide on desktop)
  <div className="max-w-7xl ...">
    <header + search>               (add className="lg:hidden" -- hide on desktop)
    <FilterSummaryStrip />          (stays visible on all)
    <div className="flex gap-6">
      <DesktopShopSidebar />        (hidden on mobile, shown lg+)
      <product grid>                (flex-1)
    </div>
  </div>
  <FilterBottomSheet />             (stays, already lg:hidden)
  <SortBottomSheet />               (stays, already lg:hidden)
```

### Real-Time Search Behavior
- The sidebar search input is bound to `localSearch` state
- On every keystroke (debounced 300ms), if length >= 2, it updates the URL search param which triggers product filtering
- If length < 2 and was previously searching, it clears the search filter
- This reuses the existing `filteredProducts` memo which already filters by `searchQuery`

## Technical Details

### DesktopShopSidebar Props
```typescript
interface DesktopShopSidebarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  // Sort
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  // Categories
  categories: Category[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onCategorySelect: (id: string) => void;
  onSubcategorySelect: (id: string) => void;
  // Colors
  availableColors: Color[];
  selectedColorIds: string[];
  onColorToggle: (id: string) => void;
  // Price
  priceRange: [number, number];
  onPriceRangeApply: (range: [number, number]) => void;
  // Clear
  onClearAll: () => void;
  hasActiveFilters: boolean;
  // Results count
  resultCount: number;
}
```

### Debounced Search Implementation
```typescript
// Inside DesktopShopSidebar
const [localInput, setLocalInput] = useState(searchValue);

useEffect(() => {
  const timer = setTimeout(() => {
    if (localInput.length >= 2) {
      onSearchChange(localInput);
    } else if (localInput.length === 0) {
      onSearchChange('');
    }
  }, 300);
  return () => clearTimeout(timer);
}, [localInput]);
```

### Shop.tsx Integration
- Add a new handler `handleDesktopSearch` that updates URL params for search
- Pass all filter state as props to `DesktopShopSidebar`
- Hide `CategorySubcategoryBar` on desktop with `lg:hidden`
- Hide the existing header search bar on desktop with `lg:hidden`
- The `FilterBottomSheet` already has `lg:hidden` so it's unaffected

## Files Modified

1. **`src/components/shop/DesktopShopSidebar.tsx`** (NEW) -- Desktop-only sidebar with real-time search, sort, categories, colors, and price filters
2. **`src/pages/Shop.tsx`** -- Add two-column layout on desktop, hide mobile-only elements on lg+, wire sidebar props

