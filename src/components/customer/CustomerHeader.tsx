
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, LogOut } from 'lucide-react';
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
  status: 'on' | 'off';
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  status: 'on' | 'off';
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
          status,
          subcategories (
            id,
            name,
            status
          )
        `)
        .eq('status', 'on')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Filter active subcategories
      const activeCategories = categoriesData?.map(category => ({
        ...category,
        subcategories: category.subcategories?.filter(sub => sub.status === 'on') || []
      })) || [];

      setCategories(activeCategories);
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
            <span className="animate-blink font-medium">
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

                {categories.map((category) => (
                  <NavigationMenuItem key={category.id}>
                    {category.subcategories && category.subcategories.length > 0 ? (
                      <>
                        <NavigationMenuTrigger className="text-gray-700 hover:text-red-600 font-medium">
                          {category.name}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <div className="grid gap-3 p-6 w-[300px]">
                            <Link
                              to={`/categories/${category.id}`}
                              className="block text-sm font-medium text-gray-900 hover:text-red-600 border-b pb-2 mb-2"
                            >
                              All {category.name}
                            </Link>
                            {category.subcategories.map((subcategory) => (
                              <Link
                                key={subcategory.id}
                                to={`/subcategories/${subcategory.id}`}
                                className="block text-sm text-gray-600 hover:text-red-600"
                              >
                                {subcategory.name}
                              </Link>
                            ))}
                          </div>
                        </NavigationMenuContent>
                      </>
                    ) : (
                      <Link
                        to={`/categories/${category.id}`}
                        className="text-gray-700 hover:text-red-600 font-medium transition-colors"
                      >
                        {category.name}
                      </Link>
                    )}
                  </NavigationMenuItem>
                ))}

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
