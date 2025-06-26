
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, User, UserCheck } from 'lucide-react';

export default function CheckoutSelection() {
  const navigate = useNavigate();
  const { cartItems, getTotalPrice } = useRobustCart();
  const { user } = useAuth();

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
    }
  }, [cartItems, navigate]);

  const handleSignInAndCheckout = () => {
    // Store intended checkout flow in localStorage
    localStorage.setItem('checkoutFlow', 'true');
    navigate('/auth');
  };

  const handleGuestCheckout = () => {
    navigate('/checkout?guest=true');
  };

  const handleAuthenticatedCheckout = () => {
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold text-center">Checkout Options</h1>
          <p className="text-gray-600 text-center mt-2">
            Total: Rs. {getTotalPrice().toFixed(2)}
          </p>
        </div>

        <div className="space-y-4">
          {user ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Continue as {user.email}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Your information will be automatically filled in the checkout form.
                </p>
                <Button
                  onClick={handleAuthenticatedCheckout}
                  className="w-full"
                  size="lg"
                >
                  Continue to Checkout
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Sign In for Faster Checkout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Sign in to save your information and track your orders.
                </p>
                <Button
                  onClick={handleSignInAndCheckout}
                  className="w-full"
                  size="lg"
                >
                  Sign In & Checkout
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Guest Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Checkout without creating an account. You'll receive an order confirmation via email.
              </p>
              <Button
                onClick={handleGuestCheckout}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Continue as Guest
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
