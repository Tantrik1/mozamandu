import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CategoriesMegaMenu } from './CategoriesMegaMenu';
interface Category {
  id: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
}
interface Subcategory {
  id: string;
  name: string;
  description: string;
  image_url: string;
  selling_price: number;
  minimum_quantity: number;
}
export function CustomerHeader() {
  const {
    user,
    signOut,
    userProfile
  } = useAuth();
  const {
    getTotalItems
  } = useRobustCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    fetchCategories();
  }, []);
  const fetchCategories = async () => {
    try {
      const {
        data: categoriesData,
        error: categoriesError
      } = await supabase.from('categories').select(`
          id,
          name,
          description,
          subcategories (
            id,
            name,
            description,
            image_url,
            selling_price,
            minimum_quantity
          )
        `).eq('status', 'on');
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Signed out successfully"
      });
      navigate('/');
    }
  };
  return <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img alt="Mozamandu Logo" src="/lovable-uploads/0ebc12de-30dd-4ab2-87ba-31f69b025360.png" className="h-14 w-auto" />
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                Home
              </Link>
              
              {/* Dynamic Categories with Mega Menu */}
              {categories.map(category => <CategoriesMegaMenu key={category.id} category={category} />)}
              
              <Link to="/faqs" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                FAQ
              </Link>
            </nav>

            {/* Right Side - Cart and User */}
            <div className="flex items-center space-x-4">
              <Link to="/cart" className="relative">
                <Button variant="outline" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                {getTotalItems() > 0 && <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs px-1.5 py-0.5">
                    {getTotalItems()}
                  </div>}
              </Link>

              {user ? <DropdownMenu>
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
                    <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders')}>Orders</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> : <Link to="/login">
                  <Button variant="outline">
                    Login
                  </Button>
                </Link>}
            </div>
          </div>
        </div>
      </div>
    </header>;
}