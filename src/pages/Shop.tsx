import { useState, useCallback, memo, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { ShopFilters } from '@/components/shop/ShopFilters';
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronRight, 
  Grid3X3, 
  LayoutGrid,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  image_url?: string;
  selling_price: number;
  category_id: string;
}

interface Product {
  id: string;
  name: string;
  image_url?: string;
  selling_price?: number;
  cost_price: number;
  subcategory_id: string;
  category_id: string;
  subcategory?: { name: string };
  is_featured?: boolean;
}

type ViewMode = 'categories' | 'subcategories' | 'products';

// Cached fetch functions
const fetchCategories = async () => {
  const { data } = await supabase
    .from('categories')
    .select('id, name, description, image_url')
    .eq('status', 'on')
    .order('name');
  return data || [];
};

const fetchSubcategories = async (categoryId: string) => {
  const { data } = await supabase
    .from('subcategories')
    .select('*')
    .eq('status', 'on')
    .eq('category_id', categoryId)
    .order('name');
  return data || [];
};

const fetchCategoryById = async (categoryId: string) => {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();
  return data;
};

const fetchSubcategoryById = async (subcategoryId: string) => {
  const { data } = await supabase
    .from('subcategories')
    .select('*, category:categories(id, name)')
    .eq('id', subcategoryId)
    .single();
  return data;
};

const fetchProductsBySubcategory = async (subcategoryId: string) => {
  const { data } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, cost_price, subcategory_id, category_id, is_featured, subcategory:subcategories(name)')
    .eq('status', 'active')
    .eq('subcategory_id', subcategoryId)
    .order('name');
  return data || [];
};

const fetchProductsBySearch = async (searchQuery: string) => {
  const searchTerm = `%${searchQuery.toLowerCase()}%`;
  const { data } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, cost_price, subcategory_id, category_id, is_featured, subcategory:subcategories(name)')
    .eq('status', 'active')
    .ilike('name', searchTerm)
    .order('name');
  return data || [];
};

const Shop = memo(function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL params
  const categoryId = searchParams.get('category');
  const subcategoryId = searchParams.get('subcategory');
  const searchQuery = searchParams.get('search') || '';
  
  // State
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(4);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([50, 10000]);

  // Determine view mode
  const viewMode: ViewMode = searchQuery 
    ? 'products' 
    : subcategoryId 
      ? 'products' 
      : categoryId 
        ? 'subcategories' 
        : 'categories';

  // React Query with caching
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['shop-categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  const { data: selectedCategory } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => fetchCategoryById(categoryId!),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: selectedSubcategory } = useQuery({
    queryKey: ['subcategory', subcategoryId],
    queryFn: () => fetchSubcategoryById(subcategoryId!),
    enabled: !!subcategoryId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['shop-subcategories', categoryId],
    queryFn: () => fetchSubcategories(categoryId!),
    enabled: !!categoryId && !subcategoryId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', subcategoryId, searchQuery],
    queryFn: () => searchQuery 
      ? fetchProductsBySearch(searchQuery) 
      : fetchProductsBySubcategory(subcategoryId!),
    enabled: !!subcategoryId || !!searchQuery,
    staleTime: 2 * 60 * 1000,
  });

  // Filter products by price range
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const price = product.selling_price || product.cost_price;
      return price >= priceRange[0] && price <= priceRange[1];
    });
  }, [products, priceRange]);

  const loading = useMemo(() => {
    if (viewMode === 'categories') return categoriesLoading;
    if (viewMode === 'subcategories') return subcategoriesLoading;
    return productsLoading;
  }, [viewMode, categoriesLoading, subcategoriesLoading, productsLoading]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchParams({ search: localSearch.trim() });
    } else {
      setSearchParams({});
    }
  }, [localSearch, setSearchParams]);

  const clearFilters = () => {
    setSearchParams({});
    setLocalSearch('');
  };

  const handleCategorySelect = (catId: string) => {
    setSearchParams({ category: catId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubcategorySelect = (subId: string) => {
    setSearchParams({ subcategory: subId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {searchQuery 
                ? `Results for "${searchQuery}"` 
                : selectedSubcategory 
                  ? selectedSubcategory.name 
                  : selectedCategory 
                    ? selectedCategory.name 
                    : 'Shop All'}
            </h1>
            {!loading && (
              <p className="text-muted-foreground mt-1">
                {viewMode === 'categories' && `${categories.length} categories`}
                {viewMode === 'subcategories' && `${subcategories.length} subcategories`}
                {viewMode === 'products' && `${filteredProducts.length} products`}
              </p>
            )}
          </div>

          {/* Search & Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9 pr-4 h-10"
              />
            </form>

            {/* Grid Toggle (Desktop) */}
            <div className="hidden lg:flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9", gridCols === 3 && "bg-accent")}
                onClick={() => setGridCols(3)}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9", gridCols === 4 && "bg-accent")}
                onClick={() => setGridCols(4)}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Filters */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <ShopFilters
                    categories={categories}
                    selectedCategoryId={categoryId}
                    selectedSubcategoryId={subcategoryId}
                    onCategorySelect={(id) => {
                      handleCategorySelect(id);
                      setMobileFiltersOpen(false);
                    }}
                    onSubcategorySelect={(id) => {
                      handleSubcategorySelect(id);
                      setMobileFiltersOpen(false);
                    }}
                    onClearFilters={() => {
                      clearFilters();
                      setPriceRange([50, 10000]);
                      setMobileFiltersOpen(false);
                    }}
                    priceRange={priceRange}
                    onPriceRangeApply={setPriceRange}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active Filters */}
        {(categoryId || subcategoryId || searchQuery || priceRange[0] !== 50 || priceRange[1] !== 10000) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium">
                <span>"{searchQuery}"</span>
                <button 
                  onClick={() => {
                    setLocalSearch('');
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    setSearchParams(newParams);
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {selectedCategory && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium">
                <span>{selectedCategory.name}</span>
                <button 
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('category');
                    newParams.delete('subcategory');
                    setSearchParams(newParams);
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {selectedSubcategory && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium">
                <span>{selectedSubcategory.name}</span>
                <button 
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('subcategory');
                    if (categoryId) newParams.set('category', categoryId);
                    setSearchParams(newParams);
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {(priceRange[0] !== 50 || priceRange[1] !== 10000) && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium">
                <span>Rs. {priceRange[0]} - Rs. {priceRange[1].toLocaleString()}</span>
                <button 
                  onClick={() => setPriceRange([50, 10000])}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                clearFilters();
                setPriceRange([50, 10000]);
              }} 
              className="text-destructive hover:text-destructive"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <ShopFilters
                categories={categories}
                selectedCategoryId={categoryId}
                selectedSubcategoryId={subcategoryId}
                onCategorySelect={handleCategorySelect}
                onSubcategorySelect={handleSubcategorySelect}
                onClearFilters={() => {
                  clearFilters();
                  setPriceRange([50, 10000]);
                }}
                priceRange={priceRange}
                onPriceRangeApply={setPriceRange}
              />
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className={cn(
                "grid gap-4",
                gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
              )}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : viewMode === 'categories' ? (
              /* Categories Grid - 1:1 Image Cards */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="group relative aspect-square rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 bg-card"
                  >
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-semibold">{category.name}</h3>
                      {category.description && (
                        <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            ) : viewMode === 'subcategories' ? (
              /* Subcategories Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {subcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => handleSubcategorySelect(subcategory.id)}
                    className="group relative aspect-square rounded-2xl bg-card border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                  >
                    {subcategory.image_url ? (
                      <img
                        src={subcategory.image_url}
                        alt={subcategory.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-semibold">{subcategory.name}</h3>
                      <p className="text-sm text-white/80">From Rs.{subcategory.selling_price}</p>
                    </div>
                  </button>
                ))}
                
                {subcategories.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No subcategories found</p>
                  </div>
                )}
              </div>
            ) : (
              /* Products Grid */
              <>
                {filteredProducts.length > 0 ? (
                  <div className={cn(
                    "grid gap-4",
                    gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
                  )}>
                    {filteredProducts.map((product) => (
                      <ShopProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No products found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery 
                        ? `We couldn't find any products matching "${searchQuery}"`
                        : "This category doesn't have any products yet"}
                    </p>
                    <Button onClick={clearFilters}>
                      Browse all products
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
});

export default Shop;