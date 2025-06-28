
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, Package, Menu, X, ShoppingCart, User } from 'lucide-react';
import { CartSidebar } from './CartSidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchNavbarItems();
  }, []);

  const fetchNavbarItems = async () => {
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
            className="relative text-gray-700 hover:text-red-600 font-medium transition-all duration-300 py-2 px-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-red-600 after:transition-all after:duration-300 hover:after:w-full"
          >
            Home
          </Link>
        );
      case 'faq':
        return (
          <Link 
            key={item.id}
            to="/faqs" 
            className="relative text-gray-700 hover:text-red-600 font-medium transition-all duration-300 py-2 px-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-red-600 after:transition-all after:duration-300 hover:after:w-full"
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
      <div
        key={item.id}
        className="relative group"
        onMouseEnter={() => setOpenMegaMenu(category.id)}
        onMouseLeave={() => setOpenMegaMenu(null)}
      >
        <button className="flex items-center gap-1 text-gray-700 hover:text-red-600 font-medium transition-all duration-300 py-2 px-1 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-red-600 after:transition-all after:duration-300 group-hover:after:w-full">
          {category.name}
          <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
        </button>
        
        {openMegaMenu === category.id && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-screen max-w-6xl bg-white shadow-2xl border-t-4 border-red-500 z-50 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{category.name}</h3>
                <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.subcategories?.map((subcategory) => (
                  <Link
                    key={subcategory.id}
                    to={`/subcategories/${subcategory.id}`}
                    className="group/item flex items-center space-x-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                    onClick={() => setOpenMegaMenu(null)}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      {subcategory.image_url ? (
                        <img 
                          src={subcategory.image_url} 
                          alt={subcategory.name}
                          className="w-16 h-16 object-cover group-hover/item:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center group-hover/item:from-red-200 group-hover/item:to-red-300 transition-all duration-300">
                          <Package className="w-8 h-8 text-red-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 group-hover/item:text-red-600 transition-colors duration-300">
                        {subcategory.name}
                      </h4>
                      <p className="text-sm text-gray-500 group-hover/item:text-gray-600 transition-colors duration-300">
                        Explore collection →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent group-hover:from-red-700 group-hover:to-red-800 transition-all duration-300">
              Mozamandu
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {otherItems.map(renderNavItem)}
            {categoryItems.map(renderCategoryItem)}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <CartSidebar />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-red-50 transition-colors duration-300">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.email}`} alt={user.email || "Avatar"} />
                      <AvatarFallback className="bg-gradient-to-br from-red-100 to-red-200 text-red-700">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-xl rounded-xl" align="end" forceMount>
                  <DropdownMenuLabel className="text-gray-700">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={handleDashboardClick} className="hover:bg-red-50 hover:text-red-700 transition-colors duration-200">
                    {userProfile?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/orders')} className="hover:bg-red-50 hover:text-red-700 transition-colors duration-200">
                    Orders
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={handleSignOut} className="hover:bg-red-50 hover:text-red-700 transition-colors duration-200">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                  Login
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 hover:bg-red-50 transition-colors duration-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 py-4">
            <div className="space-y-4">
              {otherItems.map((item) => (
                <div key={item.id}>
                  {renderNavItem(item)}
                </div>
              ))}
              {categoryItems.map((item) => {
                const category = item.category;
                if (!category) return null;
                
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="font-medium text-gray-800 px-4 py-2">{category.name}</div>
                    <div className="pl-6 space-y-2">
                      {category.subcategories?.map((subcategory) => (
                        <Link
                          key={subcategory.id}
                          to={`/subcategories/${subcategory.id}`}
                          className="block text-gray-600 hover:text-red-600 py-2 transition-colors duration-200"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subcategory.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
