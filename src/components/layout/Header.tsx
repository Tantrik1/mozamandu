
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-red-600">Mozamandu</div>
            <div className="text-sm text-gray-500">Gear Shop</div>
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link 
              to="/" 
              className={`transition-colors ${
                isActive('/') 
                  ? 'text-red-600 font-medium' 
                  : 'text-gray-700 hover:text-red-600'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/products" 
              className={`transition-colors ${
                isActive('/products') 
                  ? 'text-red-600 font-medium' 
                  : 'text-gray-700 hover:text-red-600'
              }`}
            >
              Products
            </Link>
            <Link 
              to="/categories" 
              className={`transition-colors ${
                isActive('/categories') 
                  ? 'text-red-600 font-medium' 
                  : 'text-gray-700 hover:text-red-600'
              }`}
            >
              Categories
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <ShoppingCart className="h-5 w-5" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
  );
}
