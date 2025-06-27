
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { CartSidebar } from './CartSidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { ChevronDown, Package } from 'lucide-react';

interface NavbarItem {
  id: string;
  item_type: string;
  category_id?: string;
  is_visible: boolean;
  display_order: number;
  category?: {
    id: string;
    name: string;
    subcategories: Array<{
      id: string;
      name: string;
      image_url?: string;
    }>;
  } | null;
}

export function CustomerHeader() {
  const { user, signOut, userProfile } = useAuth();
  const navigate = useNavigate();
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);

  useEffect(() => {
    fetchNavbarItems();
  }, []);

  const fetchNavbarItems = async () => {
    // Changed from INNER JOIN to LEFT JOIN to include items without categories
    const { data } = await supabase
      .from('navbar_items')
      .select(`
        *,
        category:categories(
          id,
          name,
          subcategories(id, name, image_url)
        )
      `)
      .eq('is_visible', true)
      .order('display_order');

    if (data) {
      console.log('Fetched navbar items:', data);
      setNavbarItems(data);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
      navigate('/');
    }
  };

  const handleDashboardClick = () => {
    if (userProfile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const categoryItems = navbarItems.filter(item => item.item_type === 'category' && item.category);
  const otherItems = navbarItems.filter(item => item.item_type !== 'category');

  const renderNavItem = (item: NavbarItem) => {
    switch (item.item_type) {
      case 'home':
        return (
          <Link 
            key={item.id}
            to="/" 
            className="text-gray-700 hover:text-red-600 font-medium transition-colors"
          >
            Home
          </Link>
        );
      case 'faq':
        return (
          <Link 
            key={item.id}
            to="/faqs" 
            className="text-gray-700 hover:text-red-600 font-medium transition-colors"
          >
            FAQs
          </Link>
        );
      default:
        return null;
    }
  };

  const renderCategoryItem = (item: NavbarItem) => {
    const category = item.category;
    if (!category) return null;

    return (
      <NavigationMenu key={item.id}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="text-gray-700 hover:text-red-600 font-medium transition-colors">
              {category.name}
              <ChevronDown className="ml-1 h-4 w-4" />
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="w-screen bg-white border-t shadow-lg">
                <div className="max-w-7xl mx-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {category.subcategories?.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        to={`/subcategories/${subcategory.id}`}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {subcategory.image_url ? (
                          <img 
                            src={subcategory.image_url} 
                            alt={subcategory.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-red-300" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{subcategory.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center font-bold text-xl">
              Mozamandu
            </Link>
            
            <nav className="hidden md:flex items-center space-x-8">
              {otherItems.map(renderNavItem)}
              {categoryItems.map(renderCategoryItem)}
            </nav>

            <div className="flex items-center space-x-4">
              <CartSidebar />

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.email}`} alt={user.email || "Avatar"} />
                        <AvatarFallback>
                          {user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDashboardClick}>
                      {userProfile?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders')}>Orders</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth">
                  <Button variant="outline">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
