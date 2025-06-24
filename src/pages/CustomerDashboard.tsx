
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ContactInfoForm } from '@/components/customer/ContactInfoForm';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Package, Clock, MapPin } from 'lucide-react';

export default function CustomerDashboard() {
  const { user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (userProfile && !userProfile.contact_number) {
        setShowContactForm(true);
      }
    }
  }, [user, userProfile, isLoading, navigate]);

  const handleContactInfoComplete = () => {
    setShowContactForm(false);
    window.location.reload(); // Refresh to get updated profile
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (showContactForm) {
    return <ContactInfoForm onComplete={handleContactInfoComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Customer'}!
          </h1>
          <p className="mt-2 text-gray-600">Manage your orders and account settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.full_name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {userProfile?.contact_number || 'No contact number'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                All time orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">None</div>
              <p className="text-xs text-muted-foreground">
                No recent activity
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">No orders yet</p>
              <Button 
                onClick={() => navigate('/')} 
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Start Shopping
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Number</label>
                <p className="text-sm">{userProfile?.contact_number || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">WhatsApp Number</label>
                <p className="text-sm">{userProfile?.whatsapp_number || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-sm">
                  {userProfile?.created_at 
                    ? new Date(userProfile.created_at).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
