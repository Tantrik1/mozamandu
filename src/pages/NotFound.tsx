
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">
              Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or the URL might be incorrect.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button asChild className="w-full bg-red-600 hover:bg-red-700">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Return to Home
              </Link>
            </Button>
            
            <div className="flex space-x-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/products">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Products
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>Need help? <Link to="/contact-us" className="text-red-600 hover:underline">Contact us</Link></p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
