import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { RobustCartProvider } from '@/hooks/useRobustCart';
import Home from '@/pages/Home';
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

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RobustCartProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:productId" element={<ProductDetails />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/customer-dashboard" element={<CustomerDashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/order-summary/:orderId" element={<OrderSummary />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/contact-us" element={<ContactUs />} />
              <Route path="/checkout-selection" element={<CheckoutSelection />} />
              <Route path="/checkout" element={<Checkout />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </RobustCartProvider>
    </QueryClientProvider>
  );
}

export default App;
