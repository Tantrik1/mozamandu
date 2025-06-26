
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, User, UserCheck, ShoppingBag } from 'lucide-react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';

export default function CheckoutSelection() {
  const navigate = useNavigate();
  const { cartItems, getTotalPrice } = useRobustCart();
  const { user } = useAuth();

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/products');
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
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to your cart before checking out.</p>
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <a href="/products">Continue Shopping</a>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
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
          <div className="text-center mt-2">
            <p className="text-gray-600">
              Cart Total: <span className="font-semibold text-lg">Rs. {getTotalPrice().toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {user ? (
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Continue as {user.email}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 mb-4">
                  Your information will be automatically filled in the checkout form.
                </p>
                <Button
                  onClick={handleAuthenticatedCheckout}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  Continue to Checkout
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-800">
                  <User className="w-5 h-5 mr-2" />
                  Sign In for Faster Checkout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 mb-4">
                  Sign in to save your information and track your orders easily.
                </p>
                <Button
                  onClick={handleSignInAndCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
                className="w-full border-gray-300 hover:bg-gray-50"
                size="lg"
              >
                Continue as Guest
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Need help? <a href="/contact-us" className="text-red-600 hover:underline">Contact us</a>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
