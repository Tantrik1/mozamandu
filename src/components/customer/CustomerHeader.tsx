
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CartSidebar } from './CartSidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
}

interface TopBarText {
  text: string;
  is_active: boolean;
}

export function CustomerHeader() {
  const { user, userProfile, signOut } = useAuth();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [topBarText, setTopBarText] = useState<TopBarText | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchTopBarText();
  }, []);

  const fetchCategories = async () => {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        subcategories (
          id,
          name
        )
      `)
      .eq('status', 'on');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
    } else {
      setCategories(categoriesData || []);
    }
  };

  const fetchTopBarText = async () => {
    const { data, error } = await supabase
      .from('top_bar_text')
      .select('text, is_active')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching top bar text:', error);
    } else {
      setTopBarText(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Bar */}
      {topBarText && topBarText.is_active && (
        <div className="bg-red-600 text-white text-center py-2 text-sm animate-pulse">
          {topBarText.text}
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-red-600">Mozamandu</div>
              <div className="text-sm text-gray-500">Gear Shop</div>
            </Link>

            <nav className="hidden md:flex space-x-6">
              <Link 
                to="/" 
                className={`transition-colors ${
                  isActive('/') 
                    ? 'text-red-600 font-medium border-b-2 border-red-600 pb-1' 
                    : 'text-gray-700 hover:text-red-600'
                }`}
              >
                Home
              </Link>

              {categories.map((category) => (
                category.subcategories && category.subcategories.length > 0 ? (
                  <DropdownMenu key={category.id}>
                    <DropdownMenuTrigger className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors">
                      <span>{category.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link to={`/categories/${category.id}`} className="w-full">
                          View All {category.name}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {category.subcategories.map((subcategory) => (
                        <DropdownMenuItem key={subcategory.id} asChild>
                          <Link to={`/subcategories/${subcategory.id}`} className="w-full">
                            {subcategory.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link 
                    key={category.id}
                    to={`/categories/${category.id}`}
                    className={`transition-colors ${
                      isActive(`/categories/${category.id}`) 
                        ? 'text-red-600 font-medium border-b-2 border-red-600 pb-1' 
                        : 'text-gray-700 hover:text-red-600'
                    }`}
                  >
                    {category.name}
                  </Link>
                )
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              <CartSidebar />

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={userProfile?.role === 'admin' ? '/admin' : '/customer-dashboard'}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {userProfile?.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
