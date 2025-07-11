
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { RobustCartProvider } from '@/hooks/useRobustCart';
import Index from '@/pages/Index';
import AdminPage from '@/pages/AdminPage';
import InventoryDashboard from '@/pages/InventoryDashboard';
import Checkout from '@/pages/Checkout';
import ShippingPolicy from '@/pages/ShippingPolicy';
import TermsConditions from '@/pages/TermsConditions';
import Home from '@/pages/Home';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RobustCartProvider>
          <BrowserRouter>
            <Toaster />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/home" element={<Home />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/inventory" element={<InventoryDashboard />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
            </Routes>
          </BrowserRouter>
        </RobustCartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
