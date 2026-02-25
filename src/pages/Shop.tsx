import { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import { FilterBottomSheet } from '@/components/shop/FilterBottomSheet';
import { SortBottomSheet, SortOption } from '@/components/shop/SortBottomSheet';
import { CategorySubcategoryBar } from '@/components/shop/CategorySubcategoryBar';
import { FilterSummaryStrip } from '@/components/shop/FilterSummaryStrip';
import { EmptyState } from '@/components/shop/EmptyState';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBatchProductStock, getActiveSubcategoryIds } from '@/utils/stockCalculation';

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface Color {
  id: string;
  name: string;
  hex_code: string | null;
}

interface Product {
  id: string;
  name: string;
  image_url?: string;
  selling_price: number | null;
  cost_price: number;
  subcategory_id: string;
  category_id: string;
  has_color_variants?: boolean;
  is_featured?: boolean;
  created_at?: string;
  subcategory?: { name: string; min_selling_price?: number | null };
}

const getDisplayPrice = (p: Product) =>
  p.selling_price ?? p.subcategory?.min_selling_price ?? p.cost_price;

// Fetch ALL products (default view) - filters out zero-stock
const fetchAllProducts = async () => {
  const activeSubIds = await getActiveSubcategoryIds();
  if (activeSubIds.length === 0) return [];
  const { data } = await supabase
    .from('products')
    .select(
      'id, name, image_url, selling_price, cost_price, subcategory_id, category_id, is_featured, has_color_variants, created_at, subcategory:subcategories(name, min_selling_price)'
    )
    .eq('status', 'active')
    .in('subcategory_id', activeSubIds)
    .order('created_at', { ascending: false });
  const products = data || [];
  if (products.length === 0) return products;
  const stockMap = await getBatchProductStock(products.map(p => p.id));
  return products.filter(p => (stockMap[p.id] || 0) > 0);
};

const fetchCategories = async () => {
  const { data } = await supabase
    .from('categories')
    .select('id, name, image_url')
    .eq('status', 'on')
    .order('name');
  return data || [];
};

// Fetch colors that are in use
const fetchAvailableColors = async (productIds: string[]): Promise<Color[]> => {
  if (productIds.length === 0) return [];
  
  const { data: colorVariants } = await supabase
    .from('color_variants')
    .select('color_id')
    .in('product_id', productIds)
    .not('color_id', 'is', null);
  
  if (!colorVariants || colorVariants.length === 0) return [];
  
  const uniqueColorIds = [...new Set(colorVariants.map(cv => cv.color_id))];
  
  const { data } = await supabase
    .from('colors')
    .select('id, name, hex_code')
    .in('id', uniqueColorIds)
    .eq('is_active', true)
    .order('name');
  
  return data || [];
};

// Fetch product IDs by color
const fetchProductIdsByColors = async (colorIds: string[]): Promise<string[]> => {
  if (colorIds.length === 0) return [];
  const { data } = await supabase
    .from('color_variants')
    .select('product_id')
    .in('color_id', colorIds);
  return [...new Set((data || []).map(cv => cv.product_id))];
};

const Shop = memo(function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [headerHeight, setHeaderHeight] = useState(0);
  
  // Filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<SortOption>('bestseller');
  
  // UI state
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Fetch all products
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: fetchAllProducts,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['shop-categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Get product IDs for color fetching
  const productIds = useMemo(() => allProducts.map(p => p.id), [allProducts]);

  // Fetch available colors based on current products
  const { data: availableColors = [] } = useQuery({
    queryKey: ['available-colors', productIds],
    queryFn: () => fetchAvailableColors(productIds),
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch products matching selected colors
  const { data: colorFilteredProductIds = [] } = useQuery({
    queryKey: ['color-filtered-products', selectedColorIds],
    queryFn: () => fetchProductIdsByColors(selectedColorIds),
    enabled: selectedColorIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }

    // Category filter
    if (selectedCategoryId) {
      result = result.filter(p => p.category_id === selectedCategoryId);
    }

    // Subcategory filter
    if (selectedSubcategoryId) {
      result = result.filter(p => p.subcategory_id === selectedSubcategoryId);
    }

    // Color filter
    if (selectedColorIds.length > 0 && colorFilteredProductIds.length > 0) {
      result = result.filter(p => colorFilteredProductIds.includes(p.id));
    }

    // Price filter
    result = result.filter(p => {
      const price = getDisplayPrice(p);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'price_low':
        result.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
        break;
      case 'price_high':
        result.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'bestseller':
      default:
        // Featured first, then newest
        result.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        break;
    }

    return result;
  }, [allProducts, searchQuery, selectedCategoryId, selectedSubcategoryId, selectedColorIds, colorFilteredProductIds, priceRange, sortBy]);

  // Count active filters
  const filterCount = useMemo(() => {
    let count = 0;
    if (selectedCategoryId) count++;
    if (selectedSubcategoryId) count++;
    if (selectedColorIds.length > 0) count++;
    if (priceRange[0] > 0 || priceRange[1] < 10000) count++;
    return count;
  }, [selectedCategoryId, selectedSubcategoryId, selectedColorIds, priceRange]);

  // Build applied filters for chips
  const appliedFilters = useMemo(() => {
    const filters: { id: string; label: string; type: 'category' | 'subcategory' | 'color' | 'price' | 'search'; colorHex?: string }[] = [];
    
    if (searchQuery) {
      filters.push({ id: 'search', label: `"${searchQuery}"`, type: 'search' });
    }
    
    const category = categories.find(c => c.id === selectedCategoryId);
    if (category) {
      filters.push({ id: selectedCategoryId!, label: category.name, type: 'category' });
    }
    
    selectedColorIds.forEach(colorId => {
      const color = availableColors.find(c => c.id === colorId);
      if (color) {
        filters.push({ id: colorId, label: color.name, type: 'color', colorHex: color.hex_code || undefined });
      }
    });
    
    if (priceRange[0] > 0 || priceRange[1] < 10000) {
      filters.push({ id: 'price', label: `₹${priceRange[0]} - ₹${priceRange[1]}`, type: 'price' });
    }
    
    return filters;
  }, [searchQuery, selectedCategoryId, categories, selectedColorIds, availableColors, priceRange]);

  // Handlers
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchParams({ search: localSearch.trim() });
    } else {
      setSearchParams({});
    }
  }, [localSearch, setSearchParams]);

  const handleRemoveFilter = useCallback((filterId: string, type: string) => {
    setIsFiltering(true);
    setTimeout(() => setIsFiltering(false), 300);
    
    switch (type) {
      case 'category':
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
        break;
      case 'subcategory':
        setSelectedSubcategoryId(null);
        break;
      case 'color':
        setSelectedColorIds(prev => prev.filter(id => id !== filterId));
        break;
      case 'price':
        setPriceRange([0, 10000]);
        break;
      case 'search':
        setLocalSearch('');
        setSearchParams({});
        break;
    }
  }, [setSearchParams]);

  const handleClearAllFilters = useCallback(() => {
    setIsFiltering(true);
    setTimeout(() => setIsFiltering(false), 300);
    
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setSelectedColorIds([]);
    setPriceRange([0, 10000]);
    setLocalSearch('');
    setSearchParams({});
  }, [setSearchParams]);

  const handleColorToggle = useCallback((colorId: string) => {
    setSelectedColorIds(prev => 
      prev.includes(colorId) 
        ? prev.filter(id => id !== colorId)
        : [...prev, colorId]
    );
  }, []);

  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Hydrate filters from URL (e.g. /shop?category=... from homepage)
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlSubcategory = searchParams.get('subcategory');

    setSelectedCategoryId(urlCategory);
    setSelectedSubcategoryId(urlSubcategory);
  }, [searchParams]);

  // Empty state suggestions
  const emptySuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if (selectedColorIds.length > 0) suggestions.push('removing color filter');
    if (priceRange[1] < 10000) suggestions.push('increasing price range');
    if (selectedCategoryId) suggestions.push('trying a different category');
    return suggestions;
  }, [selectedColorIds, priceRange, selectedCategoryId]);

  useEffect(() => {
    const el = document.getElementById('site-header');
    if (!el) return;

    const update = () => {
      setHeaderHeight(el.getBoundingClientRect().height);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Shop Socks in Nepal | Best Moja Prices | Mozamandu</title>
        <meta name="description" content="Shop premium socks in Nepal at Mozamandu. Best socks prices in Nepal, wide collection of moja (socks) for men, women & kids. Quality moja mandu with fast delivery." />
        <meta name="keywords" content="mozamandu shop, buy socks nepal, socks prices in nepal, moja in nepal, moja mandu, premium socks nepal, cotton socks nepal, sports socks nepal, formal socks nepal" />
        <link rel="canonical" href="https://mozamandu.com/shop" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Shop Socks in Nepal | Best Moja Prices | Mozamandu" />
        <meta property="og:description" content="Shop premium socks in Nepal at best prices. Wide collection of moja with fast delivery." />
        <meta property="og:url" content="https://mozamandu.com/shop" />
        <meta property="og:type" content="website" />
        
        {/* Breadcrumb Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mozamandu.com" },
              { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://mozamandu.com/shop" }
            ]
          })}
        </script>
        
        {/* CollectionPage Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Shop Socks in Nepal - Mozamandu",
            "description": "Browse and shop premium socks in Nepal. Best prices, quality moja with fast delivery across Nepal.",
            "url": "https://mozamandu.com/shop",
            "mainEntity": {
              "@type": "ItemList",
              "numberOfItems": filteredProducts.length,
              "itemListElement": filteredProducts.slice(0, 10).map((product, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "Product",
                  "name": product.name,
                  "url": `https://mozamandu.com/product/${product.id}`,
                  "image": product.image_url,
                  "offers": {
                    "@type": "Offer",
                    "priceCurrency": "NPR",
                    "price": product.selling_price || product.cost_price,
                    "availability": "https://schema.org/InStock"
                  }
                }
              }))
            }
          })}
        </script>
      </Helmet>
      
      <ModernNavbar />
      
      {/* Category/Subcategory Bar - Visual boxes with images */}
      <CategorySubcategoryBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={(id) => {
          setSelectedCategoryId(id);
          setSelectedSubcategoryId(null);
          updateUrlParams({ category: id, subcategory: null });
          setIsFiltering(true);
          setTimeout(() => setIsFiltering(false), 300);
        }}
        selectedSubcategoryId={selectedSubcategoryId}
        onSubcategorySelect={(id) => {
          setSelectedSubcategoryId(id);
          updateUrlParams({ subcategory: id });
          setIsFiltering(true);
          setTimeout(() => setIsFiltering(false), 300);
        }}
        onMoreFilters={() => setFilterSheetOpen(true)}
        activeFilterCount={filterCount}
        topOffset={headerHeight}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {searchQuery ? `Results for "${searchQuery}"` : 'Shop'}
            </h1>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 pr-4 h-10 rounded-xl"
            />
          </form>
        </div>

        {/* Filter Summary Strip */}
        <FilterSummaryStrip
          filters={appliedFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
          productCount={filteredProducts.length}
          className="mb-4"
        />

        {/* Product Grid */}
        <main className="flex-1 min-w-0">
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-300">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className={cn(
                "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-300",
                isFiltering && "opacity-50"
              )}>
                {filteredProducts.map((product) => (
                  <ShopProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState
                hasFilters={filterCount > 0 || searchQuery.length > 0}
                onClearFilters={handleClearAllFilters}
                suggestions={emptySuggestions}
              />
            )}
        </main>
      </div>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        availableColors={availableColors}
        selectedColorIds={selectedColorIds}
        onColorToggle={handleColorToggle}
        priceRange={priceRange}
        onPriceChange={setPriceRange}
        onApply={() => {
          setIsFiltering(true);
          setTimeout(() => setIsFiltering(false), 300);
        }}
        onReset={handleClearAllFilters}
        resultCount={filteredProducts.length}
      />

      {/* Sort Bottom Sheet */}
      <SortBottomSheet
        isOpen={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        currentSort={sortBy}
        onSortChange={setSortBy}
      />

      <Footer />
    </div>
  );
});

export default Shop;
