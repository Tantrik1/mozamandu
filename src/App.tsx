
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { RobustCartProvider } from '@/hooks/useRobustCart';
import { RouteGuard } from '@/components/RouteGuard';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AdminPage from '@/pages/AdminPage';
import CustomerDashboard from '@/pages/CustomerDashboard';
import InventoryDashboard from '@/pages/InventoryDashboard';
import Checkout from '@/pages/Checkout';
import ShippingPolicy from '@/pages/ShippingPolicy';
import TermsConditions from '@/pages/TermsConditions';
import Home from '@/pages/Home';
import SubcategoryPage from '@/pages/SubcategoryPage';
import Products from '@/pages/Products';
import FAQ from '@/pages/FAQ';
import Categories from '@/pages/Categories';
import CategoryPage from '@/pages/CategoryPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import NotFound from '@/pages/NotFound';
import ThankYou from '@/pages/ThankYou';
import OrderSummary from '@/pages/OrderSummary';
import CustomerOrderSummary from '@/pages/CustomerOrderSummary';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RobustCartProvider>
          <BrowserRouter>
            <Toaster />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <RouteGuard requireAuth={true}>
                  <CustomerDashboard />
                </RouteGuard>
              } />
              <Route path="/products" element={<Products />} />
              <Route path="/subcategory/:subcategoryId" element={<SubcategoryPage />} />
              <Route path="/subcategories/:subcategoryId" element={<SubcategoryPage />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/categories/:categoryId" element={<CategoryPage />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/shipping" element={<ShippingPolicy />} />
              <Route path="/thank-you/:orderId" element={<ThankYou />} />
              <Route path="/order-summary/:orderId" element={<OrderSummary />} />
              <Route path="/customer-order-summary/:orderId" element={
                <RouteGuard requireAuth={true}>
                  <CustomerOrderSummary />
                </RouteGuard>
              } />
              <Route path="/admin/*" element={
                <RouteGuard requireAuth={true} requireAdmin={true}>
                  <AdminPage />
                </RouteGuard>
              } />
              <Route path="/inventory" element={
                <RouteGuard requireAuth={true} requireAdmin={true}>
                  <InventoryDashboard />
                </RouteGuard>
              } />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RobustCartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
