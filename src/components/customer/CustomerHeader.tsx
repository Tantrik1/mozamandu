
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search, ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { CartSidebar } from './CartSidebar';
import { SmoothMegaMenu } from './SmoothMegaMenu';
import { ImprovedMegaMenu } from './ImprovedMegaMenu';
import { TopBar } from './TopBar';

export function CustomerHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getTotalItems } = useRobustCart();
  const { user, userProfile } = useAuth();
  const totalItems = getTotalItems();

  return (
    <>
      <TopBar />
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center">
                <img 
                  src="/lovable-uploads/c75106db-4b85-4396-a9eb-c802f441793b.png" 
                  alt="Mozamandu" 
                  className="h-8 w-auto"
                />
                <span className="ml-2 text-xl font-bold text-gray-900">Mozamandu</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                Home
              </Link>
              
              <SmoothMegaMenu />
              
              <Link to="/about" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                About
              </Link>
              <Link to="/contact" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                Contact
              </Link>
              <Link to="/faq" className="text-gray-700 hover:text-red-600 font-medium transition-colors">
                FAQ
              </Link>
            </nav>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Cart */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCartOpen(true)}
                className="relative"
              >
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>

              {/* User Account */}
              {user ? (
                <div className="flex items-center space-x-2">
                  <Link to="/customer-dashboard">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      {userProfile?.full_name || 'Account'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4">
              <div className="space-y-4">
                {/* Mobile Search */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>

                {/* Mobile Navigation Links */}
                <div className="space-y-2">
                  <Link
                    to="/"
                    className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Home
                  </Link>
                  
                  {/* Mobile Categories */}
                  <div className="px-3 py-2">
                    <ImprovedMegaMenu />
                  </div>
                  
                  <Link
                    to="/about"
                    className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    to="/contact"
                    className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  <Link
                    to="/faq"
                    className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    FAQ
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
