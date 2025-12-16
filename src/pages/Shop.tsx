import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { ShopFilters } from '@/components/shop/ShopFilters';
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface Category {
  id: string;
  name: string;
  description?: string;
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

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // URL params
  const categoryId = searchParams.get('category');
  const subcategoryId = searchParams.get('subcategory');
  const searchQuery = searchParams.get('search') || '';
  
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(4);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Selected category/subcategory info
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  // Determine view mode
  const viewMode: ViewMode = searchQuery 
    ? 'products' 
    : subcategoryId 
      ? 'products' 
      : categoryId 
        ? 'subcategories' 
        : 'categories';

  // Fetch data based on view mode
  useEffect(() => {
    fetchData();
  }, [categoryId, subcategoryId, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Always fetch categories for filters
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, description')
        .eq('status', 'on')
        .order('name');
      
      setCategories(cats || []);

      if (searchQuery) {
        // Search mode - fetch matching products
        const searchTerm = `%${searchQuery.toLowerCase()}%`;
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, image_url, selling_price, cost_price, subcategory_id, category_id, is_featured, subcategory:subcategories(name)')
          .eq('status', 'active')
          .ilike('name', searchTerm)
          .order('name');
        
        setProducts(prods || []);
        setSubcategories([]);
        setSelectedCategory(null);
        setSelectedSubcategory(null);
      } else if (subcategoryId) {
        // Subcategory selected - fetch products
        const { data: sub } = await supabase
          .from('subcategories')
          .select('*, category:categories(id, name)')
          .eq('id', subcategoryId)
          .single();
        
        if (sub) {
          setSelectedSubcategory(sub);
          setSelectedCategory(sub.category as any);
          
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, image_url, selling_price, cost_price, subcategory_id, category_id, is_featured, subcategory:subcategories(name)')
            .eq('status', 'active')
            .eq('subcategory_id', subcategoryId)
            .order('name');
          
          setProducts(prods || []);
        }
        setSubcategories([]);
      } else if (categoryId) {
        // Category selected - fetch subcategories
        const { data: cat } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();
        
        setSelectedCategory(cat);
        setSelectedSubcategory(null);
        
        const { data: subs } = await supabase
          .from('subcategories')
          .select('*')
          .eq('status', 'on')
          .eq('category_id', categoryId)
          .order('name');
        
        setSubcategories(subs || []);
        setProducts([]);
      } else {
        // No selection - show categories
        setSelectedCategory(null);
        setSelectedSubcategory(null);
        setSubcategories([]);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
  };

  const handleSubcategorySelect = (subId: string) => {
    setSearchParams({ subcategory: subId });
  };

  // Build breadcrumb
  const renderBreadcrumb = () => {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          
          {searchQuery ? (
            <BreadcrumbItem>
              <BreadcrumbPage>Search: "{searchQuery}"</BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  className={cn(!categoryId && "text-foreground font-medium")}
                  asChild
                >
                  <Link to="/shop">Shop</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              
              {selectedCategory && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      className={cn(!subcategoryId && "text-foreground font-medium")}
                      asChild
                    >
                      <Link to={`/shop?category=${selectedCategory.id}`}>
                        {selectedCategory.name}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              
              {selectedSubcategory && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedSubcategory.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          {renderBreadcrumb()}
        </div>

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
                {viewMode === 'products' && `${products.length} products`}
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
                      setMobileFiltersOpen(false);
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active Filters */}
        {(categoryId || subcategoryId || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <button onClick={() => {
                  setLocalSearch('');
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('search');
                  setSearchParams(newParams);
                }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="gap-1">
                {selectedCategory.name}
                <button onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('category');
                  newParams.delete('subcategory');
                  setSearchParams(newParams);
                }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {selectedSubcategory && (
              <Badge variant="secondary" className="gap-1">
                {selectedSubcategory.name}
                <button onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('subcategory');
                  if (categoryId) newParams.set('category', categoryId);
                  setSearchParams(newParams);
                }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
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
                onClearFilters={clearFilters}
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
              /* Categories Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="group relative aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 hover:border-primary/30 overflow-hidden transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Package className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-center">{category.name}</h3>
                      {category.description && (
                        <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
                {products.length > 0 ? (
                  <div className={cn(
                    "grid gap-4",
                    gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
                  )}>
                    {products.map((product) => (
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
}