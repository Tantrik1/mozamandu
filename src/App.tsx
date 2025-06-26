
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import { RobustCartProvider } from '@/hooks/useRobustCart';
import Home from '@/pages/Home';
import Index from '@/pages/Index';
import Products from '@/pages/Products';
import ProductDetails from '@/pages/ProductDetails';
import Categories from '@/pages/Categories';
import CustomerDashboard from '@/pages/CustomerDashboard';
import Auth from '@/pages/Auth';
import OrderSummary from '@/pages/OrderSummary';
import AboutUs from '@/pages/AboutUs';
import ContactUs from '@/pages/ContactUs';
import CheckoutSelection from '@/pages/CheckoutSelection';  
import Checkout from '@/pages/Checkout';
import Admin from '@/pages/Admin';
import EnhancedAdmin from '@/pages/EnhancedAdmin';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RobustCartProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:productId" element={<ProductDetails />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/:categoryId" element={<Categories />} />
                <Route path="/subcategories/:subcategoryId" element={<Products />} />
                <Route path="/dashboard" element={<CustomerDashboard />} />
                <Route path="/customer-dashboard" element={<CustomerDashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/order-summary/:orderId" element={<OrderSummary />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/checkout-selection" element={<CheckoutSelection />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/admin/*" element={<Admin />} />
                <Route path="/enhanced-admin/*" element={<EnhancedAdmin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </RobustCartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
