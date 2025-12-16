import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, Search, ShoppingBag, User, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRobustCart } from '@/hooks/useRobustCart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TopBar } from '@/components/customer/TopBar';
import { GlobalSearch } from './GlobalSearch';
import { MobileSearch } from './MobileSearch';
import { CartDrawer } from './CartDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function ModernNavbar() {
  const { user, userProfile, signOut } = useAuth();
  const { getTotalItems } = useRobustCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
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

  const handleDashboardClick = () => {
    if (userProfile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shop', path: '/shop', icon: Store },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const totalItems = getTotalItems();

  return (
    <>
      <div className="sticky top-0 z-50">
        <TopBar />
        
        {/* Main Navbar */}
        <header 
          className={cn(
            "bg-background/95 backdrop-blur-md border-b transition-all duration-300",
            isScrolled ? "shadow-lg border-border/50" : "border-border/30"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-18">
              
              {/* Logo */}
              <Link to="/" className="flex-shrink-0 group">
                <img 
                  alt="Mozamandu" 
                  className="h-9 w-auto transition-transform duration-300 group-hover:scale-105" 
                  src="/lovable-uploads/275eacee-9393-4919-a575-7341c6d73ab3.png" 
                />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Desktop Search Bar */}
              <div className="hidden lg:block flex-1 max-w-xl mx-8">
                <GlobalSearch />
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                {/* Mobile Search Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsMobileSearchOpen(true)}
                >
                  <Search className="w-5 h-5" />
                </Button>

                {/* Cart Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setIsCartOpen(true)}
                >
                  <ShoppingBag className="w-5 h-5" />
                  {totalItems > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground"
                    >
                      {totalItems > 99 ? '99+' : totalItems}
                    </Badge>
                  )}
                </Button>

                {/* User Menu */}
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.email}`} 
                            alt={user.email || "Avatar"} 
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{userProfile?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDashboardClick}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {userProfile?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth" className="hidden sm:block">
                    <Button size="sm" className="rounded-full px-6">
                      Login
                    </Button>
                  </Link>
                )}

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed inset-x-0 top-[calc(var(--topbar-height,40px)+64px)] bottom-0 bg-background z-50 lg:hidden animate-in slide-in-from-top-2 duration-200">
              <nav className="flex flex-col p-4 gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200",
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}
                
                <div className="border-t my-4" />
                
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        handleDashboardClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-all duration-200"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      {userProfile?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                    </button>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    Login
                  </Link>
                )}
              </nav>
            </div>
          </>
        )}
      </div>

      {/* Mobile Search Overlay */}
      <MobileSearch 
        isOpen={isMobileSearchOpen} 
        onClose={() => setIsMobileSearchOpen(false)} 
      />

      {/* Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        disableModifications={location.pathname === '/checkout'}
      />
    </>
  );
}