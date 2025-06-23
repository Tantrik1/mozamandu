
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

interface TopBarText {
  text: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
}

export function CustomerHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [topBarText, setTopBarText] = useState<TopBarText | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchTopBarText();
    fetchCategories();
  }, []);

  const fetchTopBarText = async () => {
    try {
      const { data, error } = await supabase
        .from('top_bar_text')
        .select('text, is_active')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching top bar text:', error);
        return;
      }

      if (data) {
        setTopBarText(data);
      }
    } catch (error) {
      console.error('Error fetching top bar text:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          subcategories (
            id,
            name
          )
        `)
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="w-full">
      {/* Top Bar */}
      {topBarText?.is_active && (
        <div className="bg-red-600 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <span className="animate-pulse font-medium">
              🔥 {topBarText.text} 🔥
            </span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-red-600">Mozamandu</div>
              <div className="text-sm text-gray-500">Gear Shop</div>
            </Link>

            {/* Navigation */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList className="space-x-8">
                <NavigationMenuItem>
                  <Link 
                    to="/" 
                    className="text-gray-700 hover:text-red-600 font-medium transition-colors"
                  >
                    Home
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-gray-700 hover:text-red-600 font-medium">
                    Categories
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-3 p-6 w-[400px]">
                      {categories.map((category) => (
                        <div key={category.id} className="space-y-2">
                          <Link
                            to={`/categories/${category.id}`}
                            className="block text-sm font-medium text-gray-900 hover:text-red-600"
                          >
                            {category.name}
                          </Link>
                          {category.subcategories && category.subcategories.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {category.subcategories.map((subcategory) => (
                                <Link
                                  key={subcategory.id}
                                  to={`/subcategories/${subcategory.id}`}
                                  className="block text-xs text-gray-600 hover:text-red-600"
                                >
                                  {subcategory.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link 
                    to="/contact" 
                    className="text-gray-700 hover:text-red-600 font-medium transition-colors"
                  >
                    Contact Us
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="hover:text-red-600">
                <ShoppingCart className="h-5 w-5" />
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:text-red-600">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => navigate('/customer-dashboard')}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
