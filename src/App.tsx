import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { RobustCartProvider } from "@/hooks/useRobustCart";
import { RouteGuard } from "@/components/RouteGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import SubcategoryPage from "./pages/SubcategoryPage";
import Products from "./pages/Products";
import CustomerDashboard from "./pages/CustomerDashboard";
import Checkout from "./pages/Checkout";
import OrderSummary from "./pages/OrderSummary";
import CustomerOrderSummary from "./pages/CustomerOrderSummary";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import TermsConditions from "./pages/TermsConditions";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Contact from "./pages/Contact";
import { useEffect } from 'react';

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <RobustCartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/admin/*"
                  element={
                    <RouteGuard requireAuth requireAdmin>
                      <Admin />
                    </RouteGuard>
                  }
                />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/:categoryId" element={<CategoryPage />} />
                <Route path="/subcategories/:subcategoryId" element={<SubcategoryPage />} />
                <Route path="/products" element={<Products />} />
                <Route
                  path="/dashboard"
                  element={
                    <RouteGuard requireAuth>
                      <CustomerDashboard />
                    </RouteGuard>
                  }
                />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-summary/:orderId" element={<OrderSummary />} />
                <Route path="/customer-order-summary/:orderId" element={<CustomerOrderSummary />} />
                <Route
                  path="/admin/order-summary/:orderId"
                  element={
                    <RouteGuard requireAuth requireAdmin>
                      <OrderSummary />
                    </RouteGuard>
                  }
                />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/shipping" element={<ShippingPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </RobustCartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
