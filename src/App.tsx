
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { RobustCartProvider } from "@/hooks/useRobustCart";
import Index from "./pages/Index";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import SubcategoryPage from "./pages/SubcategoryPage";
import Products from "./pages/Products";
import Checkout from "./pages/Checkout";
import OrderSummary from "./pages/OrderSummary";
import CustomerOrderSummary from "./pages/CustomerOrderSummary";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import InventoryDashboard from "./pages/InventoryDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RobustCartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/categories/:categoryId" element={<CategoryPage />} />
              <Route path="/subcategories/:subcategoryId" element={<SubcategoryPage />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<InventoryDashboard />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-summary/:orderId" element={<OrderSummary />} />
              <Route path="/customer-order-summary/:orderId" element={<CustomerOrderSummary />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RobustCartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
