import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, LogOut, LayoutDashboard, Menu, X, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}
interface Subcategory {
  id: string;
  name: string;
  selling_price: number;
  image_url?: string;
}
export function CustomerHeader() {
  const {
    user,
    userProfile,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  useEffect(() => {
    fetchCategoriesAndSubcategories();
  }, []);
  const fetchCategoriesAndSubcategories = async () => {
    try {
      const {
        data: categoriesData,
        error: categoriesError
      } = await supabase.from('categories').select(`
          id,
          name,
          subcategories (
            id,
            name,
            selling_price,
            image_url
          )
        `).eq('status', 'on').order('name');
      if (categoriesError) throw categoriesError;
      const formattedCategories = categoriesData?.map(category => ({
        ...category,
        subcategories: category.subcategories?.filter((sub: any) => sub !== null) || []
      })) || [];
      setCategories(formattedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  const handleSignOut = async () => {
    await signOut();
  };
  const handleDashboardClick = () => {
    if (userProfile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };
  const isActive = (path: string) => location.pathname === path;
  return <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img src="/lovable-uploads/2d98ffef-154e-49c8-9c1c-39e09f1ea5ae.png" alt="Mozamandu Logo" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link to="/" className={`transition-colors ${isActive('/') ? 'text-red-600 font-medium' : 'text-gray-700 hover:text-red-600'}`}>
              Home
            </Link>

            {/* Category Megamenus */}
            {categories.map(category => <div key={category.id} className="relative group" onMouseEnter={() => setHoveredCategory(category.id)} onMouseLeave={() => setHoveredCategory(null)}>
                <Link to={`/categories/${category.id}`} className={`flex items-center space-x-1 transition-colors ${location.pathname.startsWith(`/categories/${category.id}`) ? 'text-red-600 font-medium' : 'text-gray-700 hover:text-red-600'}`}>
                  <span>{category.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Link>

                {/* Megamenu */}
                {hoveredCategory === category.id && category.subcategories.length > 0 && <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-6 w-96 z-50">
                    <div className="grid grid-cols-2 gap-4">
                      {category.subcategories.map(subcategory => <Link key={subcategory.id} to={`/subcategories/${subcategory.id}`} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-300 hover:bg-gray-500 transition-colors ">
                          {subcategory.image_url && <img src={subcategory.image_url} alt={subcategory.name} className="w-12 h-12 object-cover rounded-lg" />}
                          <div>
                            <h4 className="font-medium text-gray-900">{subcategory.name}</h4>
                            <p className="text-sm text-red-600">${subcategory.selling_price}</p>
                          </div>
                        </Link>)}
                    </div>
                  </div>}
              </div>)}

            <Link to="/faq" className={`transition-colors ${isActive('/faq') ? 'text-red-600 font-medium' : 'text-gray-700 hover:text-red-600'}`}>
              FAQ
            </Link>

            <Link to="/contact" className={`transition-colors ${isActive('/contact') ? 'text-red-600 font-medium' : 'text-gray-700 hover:text-red-600'}`}>
              Contact Us
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <ShoppingCart className="h-5 w-5" />
            </Button>

            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                  <DropdownMenuItem onClick={handleDashboardClick}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {userProfile?.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> : <Link to="/auth">
                <Button size="sm" className="bg-red-600 hover:bg-red-700">Sign In</Button>
              </Link>}

            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && <div className="lg:hidden border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link to="/" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-600" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              
              {categories.map(category => <div key={category.id} className="space-y-1">
                  <Link to={`/categories/${category.id}`} className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-600" onClick={() => setMobileMenuOpen(false)}>
                    {category.name}
                  </Link>
                  {category.subcategories.map(subcategory => <Link key={subcategory.id} to={`/subcategories/${subcategory.id}`} className="block px-6 py-1 text-sm text-gray-600 hover:text-red-600" onClick={() => setMobileMenuOpen(false)}>
                      {subcategory.name} - ${subcategory.selling_price}
                    </Link>)}
                </div>)}
              
              <Link to="/faq" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-600" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </Link>
              
              <Link to="/contact" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-600" onClick={() => setMobileMenuOpen(false)}>
                Contact Us
              </Link>
            </div>
          </div>}
      </div>
    </header>;
}