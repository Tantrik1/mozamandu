import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Package, Clock } from 'lucide-react';
import { ModernNavbar } from '@/components/navbar';

export default function ThankYou() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home if no order ID
    if (!orderId) {
      navigate('/');
    }
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-t-lg">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
              <CardTitle className="text-4xl font-bold text-green-600 mb-2">
                Thank You!
              </CardTitle>
              <p className="text-xl text-gray-700 leading-relaxed">
                Your order has been successfully placed
              </p>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {/* Order Success Message */}
              <div className="text-center space-y-4">
                <p className="text-lg text-gray-700 leading-relaxed">
                  We're excited to fulfill your order! Your items have been reserved and we'll begin processing immediately.
                </p>
                <p className="text-gray-600">
                  You'll receive real-time updates as your order progresses through each stage - from payment confirmation to delivery.
                </p>
              </div>

              {/* Order Status */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        Order #{orderId?.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: Payment Pending
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* What's Next */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  What happens next?
                </h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Your order has been placed and inventory reserved</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>We'll process your payment and confirm your order within 24 hours</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <span>You'll receive tracking information once your order ships</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <span>Get real-time updates on your order status</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button 
                  onClick={() => navigate(`/order-summary/${orderId}`)}
                  className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  View Order Details
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full h-12 text-lg font-semibold"
                >
                  Continue Shopping
                </Button>
              </div>

              {/* Contact Info */}
              <div className="text-center text-sm text-gray-600 pt-4 border-t">
                <p>Need help? Contact us for any questions about your order.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}