import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { RobustCartProvider } from '@/hooks/useRobustCart';
import { RouteGuard } from '@/components/RouteGuard';
import ScrollToTop from '@/components/ScrollToTop';
import { ProductChatbot } from '@/components/chatbot';

// Lazy load pages with preloading support
const Home = lazy(() => import('@/pages/Home'));
const Auth = lazy(() => import('@/pages/Auth'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const CustomerDashboard = lazy(() => import('@/pages/CustomerDashboard'));
const InventoryDashboard = lazy(() => import('@/pages/InventoryDashboard'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const ShippingPolicy = lazy(() => import('@/pages/ShippingPolicy'));
const TermsConditions = lazy(() => import('@/pages/TermsConditions'));
const Products = lazy(() => import('@/pages/Products'));
const Shop = lazy(() => import('@/pages/Shop'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const ThankYou = lazy(() => import('@/pages/ThankYou'));
const OrderSummary = lazy(() => import('@/pages/OrderSummary'));
const CustomerOrderSummary = lazy(() => import('@/pages/CustomerOrderSummary'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));

// Preload critical routes on app mount
const preloadRoutes = () => {
  import('@/pages/Shop');
  import('@/pages/Auth');
  import('@/pages/ProductDetail');
  import('@/pages/Checkout');
};

// Optimized QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false
    }
  }
});

// Minimal loading component
const PageLoader = () => <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>;
function App() {
  // Preload critical routes after initial render
  useEffect(() => {
    const timer = setTimeout(preloadRoutes, 100);
    return () => clearTimeout(timer);
  }, []);
  return <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RobustCartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Toaster />
            <Suspense fallback={<PageLoader />}>
              <ProductChatbot />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<RouteGuard requireAuth={true}>
                    <CustomerDashboard />
                  </RouteGuard>} />
                <Route path="/products" element={<Products />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:productId" element={<ProductDetail />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
                <Route path="/shipping" element={<ShippingPolicy />} />
                <Route path="/thank-you/:orderId" element={<ThankYou />} />
                <Route path="/order-summary/:orderId" element={<OrderSummary />} />
                <Route path="/customer-order-summary/:orderId" element={<RouteGuard requireAuth={true}>
                    <CustomerOrderSummary />
                  </RouteGuard>} />
                <Route path="/admin/*" element={<RouteGuard requireAuth={true} requireAdmin={true}>
                    <AdminPage />
                  </RouteGuard>} />
                <Route path="/inventory" element={<RouteGuard requireAuth={true} requireAdmin={true}>
                    <InventoryDashboard />
                  </RouteGuard>} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </RobustCartProvider>
      </AuthProvider>
    </QueryClientProvider>;
}
export default App;