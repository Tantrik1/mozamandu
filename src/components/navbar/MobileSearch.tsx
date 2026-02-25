import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Tag, Package, FolderOpen, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getActiveSubcategoryIds } from '@/utils/stockCalculation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  type: 'category' | 'subcategory' | 'product';
  image?: string;
  parentName?: string;
  price?: number;
}

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSearch({ isOpen, onClose }: MobileSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const searchTerm = `%${searchQuery.toLowerCase()}%`;

    try {
      const activeSubIds = await getActiveSubcategoryIds();

      // Search categories - only active ones
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('status', 'on')
        .ilike('name', searchTerm)
        .limit(3);

      // Search subcategories - only those with active parent category
      const { data: subcategories } = await supabase
        .from('subcategories')
        .select('id, name, image_url, category:categories!inner(name)')
        .eq('status', 'on')
        .eq('categories.status', 'on')
        .ilike('name', searchTerm)
        .limit(5);

      // Search products - only from active subcategories
      let productQuery = supabase
        .from('products')
        .select('id, name, image_url, selling_price, subcategory:subcategories(name)')
        .eq('status', 'active')
        .ilike('name', searchTerm)
        .limit(10);

      if (activeSubIds.length > 0) {
        productQuery = productQuery.in('subcategory_id', activeSubIds);
      }

      const { data: products } = await productQuery;

      const allResults: SearchResult[] = [
        ...(categories?.map(c => ({
          id: c.id,
          name: c.name,
          type: 'category' as const,
        })) || []),
        ...(subcategories?.map(s => ({
          id: s.id,
          name: s.name,
          type: 'subcategory' as const,
          image: s.image_url || undefined,
          parentName: (s.category as any)?.name,
        })) || []),
        ...(products?.map(p => ({
          id: p.id,
          name: p.name,
          type: 'product' as const,
          image: p.image_url || undefined,
          parentName: (p.subcategory as any)?.name,
          price: p.selling_price || undefined,
        })) || []),
      ];

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  const saveRecentSearch = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    setQuery('');
    onClose();

    switch (result.type) {
      case 'category':
        navigate(`/shop?category=${result.id}`);
        break;
      case 'subcategory':
        navigate(`/shop?subcategory=${result.id}`);
        break;
      case 'product':
        navigate(`/product/${result.id}`);
        break;
    }
  };

  const handleViewAll = () => {
    if (query.trim()) {
      saveRecentSearch(query);
      onClose();
      navigate(`/shop?search=${encodeURIComponent(query)}`);
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'category':
        return <FolderOpen className="w-5 h-5 text-blue-500" />;
      case 'subcategory':
        return <Tag className="w-5 h-5 text-green-500" />;
      case 'product':
        return <Package className="w-5 h-5 text-orange-500" />;
    }
  };

  const getTypeBadge = (type: SearchResult['type']) => {
    const colors = {
      category: 'bg-blue-500/10 text-blue-600',
      subcategory: 'bg-green-500/10 text-green-600',
      product: 'bg-orange-500/10 text-orange-600',
    };
    return (
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase', colors[type])}>
        {type}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background animate-in fade-in-0 duration-200">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b z-10">
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search products, categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-11 bg-muted/50 border-0 rounded-xl"
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-64px)]">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No Results */}
        {!isLoading && query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">No results found</p>
            <p className="text-sm text-muted-foreground text-center">
              We couldn't find anything for "{query}"
            </p>
          </div>
        )}

        {/* Recent Searches */}
        {!query.trim() && recentSearches.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Recent Searches</h3>
              <button
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('recentSearches');
                }}
                className="text-xs text-primary"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(search)}
                  className="px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-accent transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="p-4 space-y-3">
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {result.image ? (
                  <img 
                    src={result.image} 
                    alt={result.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                    {getIcon(result.type)}
                  </div>
                )}
                
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{result.name}</p>
                    {getTypeBadge(result.type)}
                  </div>
                  {result.parentName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {result.parentName}
                    </p>
                  )}
                  {result.price && (
                    <p className="text-sm font-semibold text-primary mt-1">
                      Rs.{result.price}
                    </p>
                  )}
                </div>

                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}

            {/* View All Button */}
            {query.trim() && (
              <Button
                onClick={handleViewAll}
                variant="outline"
                className="w-full mt-4"
              >
                View all results for "{query}"
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!query.trim() && recentSearches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Search anything</p>
            <p className="text-sm text-muted-foreground text-center">
              Find products, categories, and more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}