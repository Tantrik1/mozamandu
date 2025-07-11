import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { RobustCartProvider } from "@/hooks/useRobustCart";
import Index from "./pages/Index";
import Category from "./pages/Category";
import Product from "./pages/Product";
import Checkout from "./pages/Checkout";
import OrderSummary from "./pages/OrderSummary";
import CustomerOrderSummary from "./pages/CustomerOrderSummary";
import CustomerOrders from "./pages/CustomerOrders";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RobustCartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/category/:categoryId" element={<Category />} />
              <Route path="/product/:productId" element={<Product />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-summary/:orderId" element={<OrderSummary />} />
              <Route path="/customer-order-summary/:orderId" element={<CustomerOrderSummary />} />
              <Route path="/customer-orders" element={<CustomerOrders />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </BrowserRouter>
        </RobustCartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
