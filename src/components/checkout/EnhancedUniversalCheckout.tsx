import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRobustCart } from '@/hooks/useRobustCart';
import { CheckoutSuccess } from './CheckoutSuccess';
import { PaymentMethodSection } from './PaymentMethodSection';
import { DeliveryLocationSelector } from './DeliveryLocationSelector';
import { ProfileAutoFill } from './ProfileAutoFill';
import { PromoCodeSection } from './PromoCodeSection';
import { PaymentScreenshotUpload } from './PaymentScreenshotUpload';
import { EnhancedCheckoutInfo } from './EnhancedCheckoutInfo';
import { AlertCircle, ShoppingCart, Loader2, Home } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface CheckoutFormData {
  customerName: string;
  customerEmail: string;
  contactNumber: string;
  whatsappNumber: string;
  whatsappSameAsContact: boolean;
  deliveryAddress: string;
  deliveryLocationId: string;
  paymentMethodId: string;
  paymentScreenshotUrl?: string;
  promocodeUsed?: string;
  paymentPercentage: number;
}

export function EnhancedUniversalCheckout() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const {
    cartItems,
    getCartTotal,
    clearCart,
    validateCartStock,
  } = useRobustCart();

  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: '',
    customerEmail: '',
    contactNumber: '',
    whatsappNumber: '',
    whatsappSameAsContact: false,
    deliveryAddress: '',
    deliveryLocationId: '',
    paymentMethodId: '',
    paymentPercentage: 100,
  });

  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [promocodeDiscount, setPromocodeDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [subcategoryRequirements, setSubcategoryRequirements] = useState<any[]>([]);

  useEffect(() => {
    validateInitialStock();
  }, []);
  
  // Check MOQ requirements
  const checkSubcategoryRequirements = async () => {
    try {
      const { data: categories } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          subcategories!inner (
            id,
            name,
            minimum_order_quantity
          )
        `);

      if (categories) {
        const requirements: any[] = [];
        
        categories.forEach(category => {
          category.subcategories?.forEach((subcategory: any) => {
            if (subcategory.minimum_order_quantity > 0) {
              const itemsInSubcategory = cartItems.filter(item => item.subcategoryId === subcategory.id);
              const currentQuantity = itemsInSubcategory.reduce((sum, item) => sum + item.quantity, 0);
              
              requirements.push({
                subcategoryId: subcategory.id,
                subcategoryName: subcategory.name,
                minimumQuantity: subcategory.minimum_order_quantity,
                currentQuantity,
                fulfilled: currentQuantity >= subcategory.minimum_order_quantity
              });
            }
          });
        });

        setSubcategoryRequirements(requirements);
      }
    } catch (error) {
      console.error('Error checking subcategory requirements:', error);
    }
  };

  const canProceedToCheckout = subcategoryRequirements.every(req => req.fulfilled);

  useEffect(() => {
    if (cartItems.length > 0) {
      checkSubcategoryRequirements();
    }
  }, [cartItems]);

  const validateInitialStock = async () => {
    console.log('🔍 Validating initial stock for checkout...');
    try {
      const isStockValid = await validateCartStock();
      if (!isStockValid) {
        toast({
          title: 'Stock Issue',
          description: 'Some items in your cart are no longer available. Please review your cart.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Stock validation failed:', error);
    }
  };

  const calculateTotals = () => {
    const subtotal = getCartTotal();
    const total = subtotal + deliveryCharge - promocodeDiscount;
    const paidAmount = (total * formData.paymentPercentage) / 100;
    const remainingAmount = total - paidAmount;

    return {
      subtotal,
      total,
      paidAmount,
      remainingAmount,
    };
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.customerName.trim()) errors.push('Customer name is required');
    if (!formData.customerEmail.trim()) errors.push('Email is required');
    if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) errors.push('Valid email address is required');
    if (!formData.contactNumber.trim()) errors.push('Contact number is required');
    if (!/^[0-9]{10}$/.test(formData.contactNumber.replace(/\D/g, ''))) errors.push('Contact number must be 10 digits');
    if (formData.whatsappNumber && !/^[0-9]{10}$/.test(formData.whatsappNumber.replace(/\D/g, ''))) errors.push('WhatsApp number must be 10 digits');
    if (!formData.deliveryAddress.trim()) errors.push('Delivery address is required');
    if (!formData.deliveryLocationId) errors.push('Delivery location is required');
    if (!formData.paymentMethodId) errors.push('Payment method is required');
    if (cartItems.length === 0) errors.push('Cart is empty');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const reserveInventoryStock = async (orderId: string) => {
    console.log('🔒 Reserving stock for order:', orderId);
    
    for (const item of cartItems) {
      if (!item.inventoryId) {
        console.warn('⚠️ Missing inventory ID for item:', item.productName);
        continue;
      }

      try {
        const { error } = await supabase.rpc('safe_update_stock', {
          p_product_id: item.productId,
          p_stock_change: 0,
          p_color_variant_id: item.colorVariantId || null,
          p_size_variant_id: item.sizeVariantId || null,
          p_reservation_change: item.quantity,
          p_reason: `Stock reservation for order - ${item.productName}`,
          p_order_id: orderId,
          p_order_number: null,
          p_transaction_type: 'reserve'
        });

        if (error) {
          console.error('❌ Failed to reserve stock for item:', item.productName, error);
          throw new Error(`Failed to reserve stock for ${item.productName}: ${error.message}`);
        }

        console.log('✅ Stock reserved for:', item.productName, 'Quantity:', item.quantity);
      } catch (error) {
        console.error('❌ Stock reservation error:', error);
        throw error;
      }
    }
  };

  const handleProfileAutoFill = (data: Partial<CheckoutFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...data
    }));
  };

  const handleSubmitOrder = async () => {
    try {
      setIsSubmitting(true);
      console.log('🚀 Starting enhanced checkout process...');

      if (!validateForm()) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      console.log('🔍 Final stock validation...');
      const isStockValid = await validateCartStock();
      if (!isStockValid) {
        toast({
          title: 'Stock Unavailable',
          description: 'Some items are no longer available. Please review your cart.',
          variant: 'destructive',
        });
        return;
      }

      // Check MOQ requirements before proceeding
      if (!canProceedToCheckout) {
        toast({
          title: 'Minimum Order Requirements Not Met',
          description: 'Please return to home and add more items to meet minimum quantity requirements.',
          variant: 'destructive',
        });
        return;
      }

      const totals = calculateTotals();

      console.log('📝 Creating order...');
      const { data: createdOrder, error: orderError } = await supabase
        .from('customer_orders')
        .insert({
          user_id: user?.id || null,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          contact_number: formData.contactNumber,
          whatsapp_number: formData.whatsappNumber || null,
          delivery_address: formData.deliveryAddress,
          delivery_location_id: formData.deliveryLocationId,
          payment_method_id: formData.paymentMethodId,
          payment_screenshot_url: formData.paymentScreenshotUrl || null,
          promocode_used: formData.promocodeUsed || null,
          subtotal: totals.subtotal,
          delivery_charge: deliveryCharge,
          promocode_discount: promocodeDiscount,
          total_amount: totals.total,
          paid_amount: totals.paidAmount,
          remaining_amount: totals.remainingAmount,
          payment_percentage: formData.paymentPercentage,
          status: 'pending_payment' as const,
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Order creation failed:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log('✅ Order created:', createdOrder.id);

      const orderItemsToInsert = cartItems.map(item => ({
        order_id: createdOrder.id,
        product_inventory_id: item.inventoryId,
        product_name: item.productName,
        color_name: item.colorName || null,
        size_name: item.sizeName || null,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        pricing_mode: 'normal',
        pricing_details: null,
      }));

      const { error: itemDetailsError } = await supabase
        .from('customer_order_item_details')
        .insert(orderItemsToInsert);

      if (itemDetailsError) {
        console.error('❌ Order item details creation failed:', itemDetailsError);
        throw new Error(`Failed to create order items: ${itemDetailsError.message}`);
      }

      console.log('🔒 Reserving inventory stock...');
      await reserveInventoryStock(createdOrder.id);

      console.log('🎉 Order completed successfully!');
      
      // Show success toast notification
      toast({
        title: 'Order Placed Successfully!',
        description: 'Your order has been created and stock has been reserved.',
        duration: 5000,
      });

      // Clear cart and show success
      clearCart();
      setOrderId(createdOrder.id);
      setShowSuccess(true);

    } catch (error) {
      console.error('💥 Checkout failed:', error);
      toast({
        title: 'Checkout Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess && orderId) {
    return <CheckoutSuccess orderId={orderId} />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-4">Add some products to your cart to proceed with checkout.</p>
              <Button onClick={() => window.location.href = '/'}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your order with real-time inventory management</p>
        </div>

        {/* Cart Modification Warning */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-800">Cart Locked for Checkout</h3>
                <p className="text-sm text-orange-700 mt-1">
                  To modify your cart items, please return to the home page. Cart changes are not allowed during checkout to ensure order accuracy.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  clearCart();
                  window.location.href = '/';
                }}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {validationErrors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Please fix the following errors:</h3>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MOQ Requirements Warning */}
        {subcategoryRequirements.length > 0 && !canProceedToCheckout && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800">Minimum Order Requirements Not Met</h3>
                  <p className="text-sm text-red-700 mt-1">
                    You must meet the minimum quantity requirements for each product category before proceeding.
                  </p>
                  <div className="mt-3 space-y-2">
                    {subcategoryRequirements.filter(req => !req.fulfilled).map((req) => (
                      <div key={req.subcategoryId} className="flex items-center justify-between text-sm">
                        <span className="text-red-700">{req.subcategoryName}</span>
                        <span className="text-red-600 font-medium">
                          {req.currentQuantity}/{req.minimumQuantity} (Need {req.minimumQuantity - req.currentQuantity} more)
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      clearCart();
                      window.location.href = '/';
                    }}
                    className="mt-3 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Return to Shopping
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
                
                {user && <ProfileAutoFill onDataFilled={handleProfileAutoFill} />}
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerEmail">Email Address *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) {
                          setFormData(prev => ({ 
                            ...prev, 
                            contactNumber: value,
                            whatsappNumber: prev.whatsappSameAsContact ? value : prev.whatsappNumber
                          }));
                        }
                      }}
                      placeholder="Enter your 10-digit contact number"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="whatsappSameAsContact"
                          checked={formData.whatsappSameAsContact}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ 
                              ...prev, 
                              whatsappSameAsContact: checked as boolean,
                              whatsappNumber: checked ? prev.contactNumber : prev.whatsappNumber
                            }))
                          }
                        />
                        <Label htmlFor="whatsappSameAsContact" className="text-sm">
                          Same as contact number
                        </Label>
                      </div>
                      <Input
                        id="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            setFormData(prev => ({ ...prev, whatsappNumber: value }));
                          }
                        }}
                        placeholder="Enter your 10-digit WhatsApp number"
                        disabled={formData.whatsappSameAsContact}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                    <Textarea
                      id="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                      placeholder="Enter your complete delivery address"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <DeliveryLocationSelector
              selectedLocationId={formData.deliveryLocationId}
              onLocationChange={(locationId, charge) => {
                setFormData(prev => ({ ...prev, deliveryLocationId: locationId }));
                setDeliveryCharge(charge);
              }}
            />

            <PaymentMethodSection
              selectedMethodId={formData.paymentMethodId}
              onMethodChange={(methodId) => setFormData(prev => ({ ...prev, paymentMethodId: methodId }))}
              paymentPercentage={formData.paymentPercentage}
              onPercentageChange={(percentage) => setFormData(prev => ({ ...prev, paymentPercentage: percentage }))}
            />

            <PaymentScreenshotUpload
              onUploadComplete={(url) => setFormData(prev => ({ ...prev, paymentScreenshotUrl: url }))}
            />
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <PromoCodeSection
              onDiscountApplied={setPromocodeDiscount}
              onPromoCodeUsed={(code) => setFormData(prev => ({ ...prev, promocodeUsed: code }))}
              orderTotal={getCartTotal() + deliveryCharge}
            />

            <EnhancedCheckoutInfo
              cartItems={cartItems}
              subtotal={getCartTotal()}
              deliveryCharge={deliveryCharge}
              promocodeDiscount={promocodeDiscount}
              paymentPercentage={formData.paymentPercentage}
            />

            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || cartItems.length === 0 || !canProceedToCheckout}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Order...
                </>
              ) : !canProceedToCheckout ? (
                'Minimum Requirements Not Met'
              ) : (
                `Place Order (${calculateTotals().total.toFixed(2)} Rs)`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
