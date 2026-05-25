import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Tag, Package, FolderOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getActiveSubcategoryIds } from '@/utils/stockCalculation';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  type: 'category' | 'subcategory' | 'product';
  image?: string;
  parentName?: string;
  price?: number;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
        .limit(8);

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

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);

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

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'category':
        return <FolderOpen className="w-4 h-4 text-blue-500" />;
      case 'subcategory':
        return <Tag className="w-4 h-4 text-green-500" />;
      case 'product':
        return <Package className="w-4 h-4 text-orange-500" />;
    }
  };

  const groupedResults = {
    categories: results.filter(r => r.type === 'category'),
    subcategories: results.filter(r => r.type === 'subcategory'),
    products: results.filter(r => r.type === 'product'),
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search products, categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-11 bg-muted/50 border-0 rounded-full focus-visible:ring-2 focus-visible:ring-primary/20"
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
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          {results.length === 0 && !isLoading && query.trim() && (
            <div className="p-6 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
              {/* Categories */}
              {groupedResults.categories.length > 0 && (
                <div className="p-2">
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Categories
                  </p>
                  {groupedResults.categories.map((result, idx) => {
                    const globalIdx = idx;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          selectedIndex === globalIdx
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{result.name}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Subcategories */}
              {groupedResults.subcategories.length > 0 && (
                <div className="p-2 border-t">
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Subcategories
                  </p>
                  {groupedResults.subcategories.map((result, idx) => {
                    const globalIdx = groupedResults.categories.length + idx;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          selectedIndex === globalIdx
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        {result.image ? (
                          <img 
                            src={result.image} 
                            alt={result.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            {getIcon(result.type)}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{result.name}</p>
                          {result.parentName && (
                            <p className="text-xs text-muted-foreground">in {result.parentName}</p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Products */}
              {groupedResults.products.length > 0 && (
                <div className="p-2 border-t">
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Products
                  </p>
                  {groupedResults.products.map((result, idx) => {
                    const globalIdx = groupedResults.categories.length + groupedResults.subcategories.length + idx;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          selectedIndex === globalIdx
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        {result.image ? (
                          <img 
                            src={result.image} 
                            alt={result.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            {getIcon(result.type)}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">{result.name}</p>
                          {result.parentName && (
                            <p className="text-xs text-muted-foreground">{result.parentName}</p>
                          )}
                        </div>
                        {result.price && (
                          <span className="text-sm font-semibold text-primary">
                            Rs.{result.price}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* View All Results */}
              {query.trim() && (
                <div className="p-2 border-t">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate(`/shop?search=${encodeURIComponent(query)}`);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    View all results for "{query}"
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}