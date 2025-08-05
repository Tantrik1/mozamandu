
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { RobustCartProvider } from '@/hooks/useRobustCart';
import { RouteGuard } from '@/components/RouteGuard';

// Lazy load pages for better performance with more aggressive preloading
const Home = lazy(() => import('@/pages/Home'));
const Auth = lazy(() => import('@/pages/Auth'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const CustomerDashboard = lazy(() => import('@/pages/CustomerDashboard'));
const InventoryDashboard = lazy(() => import('@/pages/InventoryDashboard'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const ShippingPolicy = lazy(() => import('@/pages/ShippingPolicy'));
const TermsConditions = lazy(() => import('@/pages/TermsConditions'));
const SubcategoryPage = lazy(() => import('@/pages/SubcategoryPage'));
const Products = lazy(() => import('@/pages/Products'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Categories = lazy(() => import('@/pages/Categories'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const ThankYou = lazy(() => import('@/pages/ThankYou'));
const OrderSummary = lazy(() => import('@/pages/OrderSummary'));
const CustomerOrderSummary = lazy(() => import('@/pages/CustomerOrderSummary'));

// Optimized QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Faster loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <div className="text-xs text-muted-foreground">Loading...</div>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RobustCartProvider>
          <BrowserRouter>
            <Toaster />
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </BrowserRouter>
        </RobustCartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
