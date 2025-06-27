
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
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
import { useNavigate } from 'react-router-dom';
import { CategoriesMegaMenu } from './CategoriesMegaMenu';

export function CustomerHeader() {
  const { user, signOut, userProfile } = useAuth();
  const { getTotalItems } = useRobustCart();
  const navigate = useNavigate();

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

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end h-8">
            <p className="text-gray-500 text-sm">
              Free shipping on orders over Rs. 2000
            </p>
          </div>
        </div>
      </div>
      
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center font-bold text-xl">
              Mozamandu
            </Link>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                Home
              </Link>
              
              <CategoriesMegaMenu />
              
              <Link to="/faqs" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                FAQs
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link to="/cart" className="relative">
                <Button variant="outline" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                {getTotalItems() > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs px-1.5 py-0.5">
                    {getTotalItems()}
                  </div>
                )}
              </Link>

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
                    <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/orders')}>Orders</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/login">
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
