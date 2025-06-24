
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import SubcategoryPage from "./pages/SubcategoryPage";
import Products from "./pages/Products";
import CustomerDashboard from "./pages/CustomerDashboard";
import Checkout from "./pages/Checkout";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import TermsConditions from "./pages/TermsConditions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/*" element={<Admin />} />
                {/* Redirect /home to / to consolidate routes */}
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/:categoryId" element={<CategoryPage />} />
                <Route path="/subcategories/:subcategoryId" element={<SubcategoryPage />} />
                <Route path="/products" element={<Products />} />
                <Route path="/dashboard" element={<CustomerDashboard />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/shipping" element={<ShippingPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
