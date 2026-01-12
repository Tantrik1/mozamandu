import { useState, useEffect, memo, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Store, Search, ShoppingBag, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TopBar } from '@/components/customer/TopBar';
import { GlobalSearch } from './GlobalSearch';
import { MobileSearch } from './MobileSearch';
import { CartDrawer } from './CartDrawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const ModernNavbar = memo(function ModernNavbar() {
  const {
    user,
    userProfile,
    signOut
  } = useAuth();
  const {
    cartItems,
    getTotalItems
  } = useRobustCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: any[] }>({});

  // Fetch discount tiers for accurate cart total calculation
  useEffect(() => {
    const fetchDiscountTiers = async () => {
      try {
        const { data } = await supabase
          .from('discount_tiers')
          .select('*')
          .order('subcategory_id, min_quantity');
        
        if (data) {
          const tiersBySubcategory: { [key: string]: any[] } = {};
          data.forEach(tier => {
            if (!tiersBySubcategory[tier.subcategory_id]) {
              tiersBySubcategory[tier.subcategory_id] = [];
            }
            // Normalize: map discount_percentage to discount_amount for compatibility
            const tierAny = tier as any;
            tiersBySubcategory[tier.subcategory_id].push({
              ...tier,
              discount_amount: tierAny.discount_amount ?? tier.discount_percentage ?? 0,
            });
          });
          setDiscountTiers(tiersBySubcategory);
        }
      } catch (error) {
        console.error('Error fetching discount tiers:', error);
      }
    };
    fetchDiscountTiers();
  }, []);

  // Use tiered pricing for accurate cart total
  const { getTotalPrice: getTieredTotalPrice } = useSubcategoryTieredPricing({
    cartItems,
    discountTiers
  });

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleDashboardClick = () => {
    if (userProfile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  // Get accurate cart total with tiered pricing
  const cartTotal = useMemo(() => getTieredTotalPrice(), [getTieredTotalPrice]);
  return <>
      <div id="site-header" className="sticky top-0 z-50">
        <TopBar />
        
        {/* Main Navbar */}
        <header className={cn("bg-background/95 backdrop-blur-md border-b transition-all duration-300", isScrolled ? "shadow-lg border-border/50" : "border-border/30")}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-18">
              
              {/* Logo */}
              <Link to="/" className="flex-shrink-0 group">
                <img alt="Mozamandu" loading="eager" src="/lovable-uploads/c5be09dc-3446-4e71-9d5a-482531992782.jpg" className="h-9 w-auto transition-transform duration-300 group-hover:scale-105 object-cover" width={120} height={36} />
              </Link>

              {/* Desktop Search Bar */}
              <div className="hidden lg:block flex-1 max-w-xl mx-8">
                <GlobalSearch />
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                {/* Mobile Search Button */}
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileSearchOpen(true)}>
                  <Search className="w-5 h-5" />
                </Button>

                {/* Shop Button - visible on all screens */}
                <Link to="/shop">
                  <Button variant="ghost" size="sm" className={cn("flex flex-col items-center gap-0.5 h-auto py-1.5 px-2", location.pathname.startsWith('/shop') && "bg-primary text-primary-foreground")}>
                    <Store className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Shop</span>
                  </Button>
                </Link>

                {/* Cart Button */}
                <Button variant="ghost" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 relative" onClick={() => setIsCartOpen(true)}>
                  <ShoppingBag className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Cart</span>
                  {cartTotal > 0 && <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[9px] bg-primary text-primary-foreground flex items-center justify-center">
                      {`Rs.${Math.round(cartTotal).toLocaleString()}`}
                    </Badge>}
                </Button>

                {/* User Menu */}
                {user ? <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.email}`} alt={user.email || "Avatar"} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-medium">Profile</span>
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
                  </DropdownMenu> : <Link to="/auth">
                    <Button variant="ghost" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2">
                      <User className="w-5 h-5" />
                      <span className="text-[10px] font-medium">Login</span>
                    </Button>
                  </Link>}
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Search Overlay */}
      <MobileSearch isOpen={isMobileSearchOpen} onClose={() => setIsMobileSearchOpen(false)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} disableModifications={location.pathname === '/checkout'} />
    </>;
});