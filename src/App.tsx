import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/contexts/AuthContext';
import Index from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import AdminPage from '@/pages/AdminPage';
import InventoryDashboard from '@/pages/InventoryDashboard';
import CheckoutPage from '@/pages/CheckoutPage';
import CheckoutSuccess from '@/pages/CheckoutSuccess';
import ProductsPage from '@/pages/ProductsPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CustomerArea from '@/pages/CustomerArea';
import ContactPage from '@/pages/ContactPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/products/:categoryId" element={<ProductsPage />} />
            <Route path="/products/:categoryId/:subcategoryId" element={<ProductsPage />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/customer/*" element={<CustomerArea />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
