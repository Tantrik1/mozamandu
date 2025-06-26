
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { RouteGuard } from "@/components/RouteGuard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NoticePopup } from "@/components/notices/NoticePopup";

import Index from "./pages/Index";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import SubcategoryPage from "./pages/SubcategoryPage";
import Auth from "./pages/Auth";
import CustomerDashboard from "./pages/CustomerDashboard";
import Admin from "./pages/Admin";
import EnhancedAdmin from "./pages/EnhancedAdmin";
import Checkout from "./pages/Checkout";
import OrderSummary from "./pages/OrderSummary";
import Contact from "./pages/Contact";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import ShippingPolicy from "./pages/ShippingPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <NoticePopup />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/home" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              <Route path="/subcategory/:subcategoryId" element={<SubcategoryPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/dashboard" 
                element={
                  <RouteGuard requireAuth>
                    <CustomerDashboard />
                  </RouteGuard>
                } 
              />
              <Route 
                path="/admin/*" 
                element={
                  <RouteGuard requireAuth requireAdmin>
                    <EnhancedAdmin />
                  </RouteGuard>
                } 
              />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-summary" element={<OrderSummary />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/shipping" element={<ShippingPolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
