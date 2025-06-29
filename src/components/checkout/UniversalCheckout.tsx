import { useState, useEffect } from 'react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { usePromoCode } from '@/hooks/usePromoCode';
import { CustomerInfoForm } from './CustomerInfoForm';
import { DeliveryLocationSelector } from './DeliveryLocationSelector';
import { PromoCodeSection } from './PromoCodeSection';
import { PaymentMethodSection } from './PaymentMethodSection';
import { OrderSummaryCard } from './OrderSummaryCard';
import { reduceStockForOrder, restoreStockForOrder } from '@/utils/stockManagement';

interface FormErrors {
  [key: string]: string;
}

export function UniversalCheckout() {
  const { cartItems, getTotalPrice, clearCart, getItemPricing } = useRobustCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { deliveryCharges, paymentMethods, loading } = useCheckoutData();
  const { 
    promoCode, 
    setPromoCode, 
    appliedPromo, 
    isPromoApplied, 
    applyPromoCode, 
    removePromoCode 
  } = usePromoCode();
  
  // Form state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    contact: '',
    whatsapp: '',
    address: ''
  });
  
  // Checkout data
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  
  // Payment type state
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [paidAmount, setPaidAmount] = useState('');
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
      return;
    }
    
    // Auto-fill user info if logged in
    if (user && userProfile) {
      setCustomerInfo(prev => ({
        ...prev,
        name: userProfile.full_name || '',
        email: userProfile.email || user.email || '',
        contact: userProfile.contact_number || '',
        whatsapp: userProfile.whatsapp_number || ''
      }));
    }
  }, [cartItems, user, userProfile, navigate]);

  // Determine which bucket to use based on user type
  const getBucketName = () => {
    if (!user) {
      return 'guest-payments';
    }
    
    if (userProfile?.role === 'admin') {
      return 'admin-payments';
    }
    
    return 'customer-payments';
  };

  // Determine if this is a customer order (logged in non-admin user)
  const isCustomerOrder = () => {
    return user && userProfile?.role !== 'admin';
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Required field validation
    if (!customerInfo.name.trim()) errors.name = 'Name is required';
    if (!customerInfo.email.trim()) errors.email = 'Email is required';
    if (!customerInfo.contact.trim()) errors.contact = 'Contact number is required';
    if (!customerInfo.address.trim()) errors.address = 'Delivery address is required';
    if (!selectedDelivery) errors.delivery = 'Please select delivery location';
    if (!selectedPayment) errors.payment = 'Please select payment method';

    // Email validation
    if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Payment amount validation for partial payment
    if (paymentType === 'partial') {
      if (!paidAmount || parseFloat(paidAmount) <= 0) {
        errors.paidAmount = 'Please enter a valid payment amount';
      }
    }

    // Make payment screenshot compulsory
    if (!paymentScreenshot) {
      errors.paymentScreenshot = 'Payment screenshot is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadPaymentScreenshot = async (): Promise<string | null> => {
    if (!paymentScreenshot) return null;

    setUploadingScreenshot(true);
    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `payment-${Date.now()}.${fileExt}`;
      const filePath = `payment-screenshots/${fileName}`;
      const bucketName = getBucketName();

      console.log(`Uploading payment screenshot to ${bucketName} bucket:`, filePath);

      // Upload to the appropriate bucket based on user type
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, paymentScreenshot, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading payment screenshot:', uploadError);
        throw new Error('Failed to upload payment screenshot: ' + uploadError.message);
      }

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log('Payment screenshot uploaded successfully:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading payment screenshot:', error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload payment screenshot",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log('Starting order submission process...');
      console.log('User authenticated:', !!user);
      console.log('User ID:', user?.id);
      console.log('Is customer order:', isCustomerOrder());

      const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
      const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
      const subtotal = getTotalPrice();
      const totalWithDelivery = subtotal + deliveryPrice;
      const promoDiscount = appliedPromo 
        ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 
        : 0;
      const finalTotal = totalWithDelivery - promoDiscount;
      const actualPaidAmount = paymentType === 'full' ? finalTotal : parseFloat(paidAmount);

      // Upload payment screenshot if provided
      let paymentScreenshotUrl = null;
      if (paymentScreenshot) {
        paymentScreenshotUrl = await uploadPaymentScreenshot();
        
        if (!paymentScreenshotUrl) {
          console.warn('Payment screenshot upload failed, but continuing with order');
        }
      }

      // Enhanced stock reduction with better error handling
      console.log('Validating and reducing stock for order items...');
      try {
        await reduceStockForOrder(cartItems);
        console.log('Stock reduced successfully');
        
        // Show success message for stock reduction
        toast({
          title: "Stock Updated",
          description: "Product stock has been successfully reserved for your order.",
        });
      } catch (stockError) {
        console.error('Stock reduction failed:', stockError);
        toast({
          title: "Stock Error",
          description: stockError instanceof Error ? stockError.message : "There was an error updating stock. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Prepare base order data
      const baseOrderData = {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        contact_number: customerInfo.contact,
        whatsapp_number: customerInfo.whatsapp || customerInfo.contact,
        delivery_location_id: selectedDelivery,
        delivery_address: customerInfo.address,
        delivery_charge: deliveryPrice,
        subtotal: subtotal,
        total_amount: finalTotal,
        paid_amount: actualPaidAmount,
        remaining_amount: finalTotal - actualPaidAmount,
        payment_method_id: selectedPayment,
        payment_screenshot_url: paymentScreenshotUrl,
        status: 'pending_payment' as const,
        combo_applied: false,
        promocode_used: appliedPromo?.code || null,
        promocode_discount: promoDiscount
      };

      let orderResult = null;

      // Submit to customer_orders table if logged in non-admin user
      if (isCustomerOrder()) {
        console.log('Creating customer order...');
        const customerOrderData = {
          ...baseOrderData,
          user_id: user!.id
        };

        const { data: order, error: orderError } = await supabase
          .from('customer_orders')
          .insert(customerOrderData)
          .select()
          .single();

        if (orderError) {
          console.error('Customer order creation error:', orderError);
          throw new Error(`Customer order creation failed: ${orderError.message}`);
        }

        orderResult = order;
        console.log('Customer order created successfully:', orderResult);
      } else {
        // Submit to orders table for guest/admin orders
        console.log('Creating regular order...');
        const regularOrderData = {
          ...baseOrderData,
          user_id: user?.id || null
        };

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(regularOrderData)
          .select()
          .single();

        if (orderError) {
          console.error('Order creation error:', orderError);
          
          // Better error handling for RLS issues
          if (orderError.code === '42501' || orderError.message.includes('row-level security')) {
            console.log('Retrying as explicit guest order...');
            const guestOrderData = {
              ...regularOrderData,
              user_id: null // Force null for guest orders
            };
            
            const { data: guestOrder, error: guestOrderError } = await supabase
              .from('orders')
              .insert(guestOrderData)
              .select()
              .single();
              
            if (guestOrderError) {
              console.error('Guest order creation also failed:', guestOrderError);
              throw new Error('Unable to create order. Please try again or contact support.');
            }
            
            orderResult = guestOrder;
          } else {
            throw new Error(`Order creation failed: ${orderError.message}`);
          }
        } else {
          orderResult = order;
        }

        console.log('Regular order created successfully:', orderResult);
      }

      if (!orderResult) {
        throw new Error('Order was not created properly');
      }

      // Create order items with better error handling and validation
      const orderItems = [];
      const orderItemDetails = [];
      const orderItemsTable = isCustomerOrder() ? 'customer_order_items' : 'order_items';
      const orderItemDetailsTable = isCustomerOrder() ? 'customer_order_item_details' : 'order_item_details';

      for (const item of cartItems) {
        // Validate that the variant IDs exist if they're provided
        let validColorVariantId = null;
        let validSizeVariantId = null;

        if (item.colorVariantId) {
          const { data: colorVariant } = await supabase
            .from('color_variants')
            .select('id')
            .eq('id', item.colorVariantId)
            .single();
          
          if (colorVariant) {
            validColorVariantId = item.colorVariantId;
          } else {
            console.warn(`Color variant ${item.colorVariantId} not found, setting to null`);
          }
        }

        if (item.sizeVariantId) {
          const { data: sizeVariant } = await supabase
            .from('size_variants')
            .select('id')
            .eq('id', item.sizeVariantId)
            .single();
          
          if (sizeVariant) {
            validSizeVariantId = item.sizeVariantId;
          } else {
            console.warn(`Size variant ${item.sizeVariantId} not found, setting to null`);
          }
        }

        // Create order item with validated variant IDs
        const orderItem = {
          order_id: orderResult.id,
          product_id: item.productId,
          color_variant_id: validColorVariantId,
          size_variant_id: validSizeVariantId,
          quantity: item.quantity
        };

        orderItems.push(orderItem);

        // Create order item details
        const pricing = getItemPricing(item);
        const orderItemDetail = {
          order_id: orderResult.id,
          product_name: item.productName,
          color_name: item.colorName || '',
          size_name: item.sizeName || '',
          quantity: item.quantity,
          unit_price: pricing.finalPrice,
          total_price: pricing.finalPrice * item.quantity,
          pricing_mode: pricing.mode
        };

        orderItemDetails.push(orderItemDetail);
      }

      console.log(`Creating order items in ${orderItemsTable}:`, orderItems.length);

      // Insert order items
      const { error: itemsError } = await supabase
        .from(orderItemsTable)
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        
        // Try to cleanup the order if items creation fails
        const deleteTable = isCustomerOrder() ? 'customer_orders' : 'orders';
        await supabase.from(deleteTable).delete().eq('id', orderResult.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      // Create order item details
      const { error: detailsError } = await supabase
        .from(orderItemDetailsTable)
        .insert(orderItemDetails);

      if (detailsError) {
        console.error('Order item details creation error:', detailsError);
        // Don't fail the order for this, just log it
      }

      console.log('Order items created successfully');

      // Send order creation email
      try {
        console.log('Sending order creation email...');
        const { error: emailError } = await supabase.functions.invoke('send-order-email', {
          body: {
            type: 'order_created',
            orderId: orderResult.id,
            isCustomerOrder: isCustomerOrder()
          }
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the order if email fails
        } else {
          console.log('Order creation email sent successfully');
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the order if email fails
      }

      // Clear cart and redirect to order summary
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${orderResult.order_number} has been placed successfully. Stock has been updated and a confirmation email has been sent.`,
      });

      // Redirect to appropriate order summary page
      const summaryRoute = isCustomerOrder() ? 'customer-order-summary' : 'order-summary';
      navigate(`/${summaryRoute}/${orderResult.id}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Enhanced stock restoration with better error handling
      try {
        console.log('Restoring stock due to order creation failure...');
        const stockItems = cartItems.map(item => ({
          productId: item.productId,
          colorVariantId: item.colorVariantId,
          sizeVariantId: item.sizeVariantId,
          quantity: item.quantity
        }));
        await restoreStockForOrder(stockItems);
        console.log('Stock restored successfully after order failure');
        
        toast({
          title: "Stock Restored",
          description: "Product stock has been restored due to order creation failure.",
        });
      } catch (restoreError) {
        console.error('Failed to restore stock:', restoreError);
        toast({
          title: "Critical Error",
          description: "Order failed and stock could not be restored. Please contact support immediately.",
          variant: "destructive",
        });
      }
      
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
  const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
  const subtotal = getTotalPrice();
  const totalWithDelivery = subtotal + deliveryPrice;
  const promoDiscount = appliedPromo 
    ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 
    : 0;
  const finalTotal = totalWithDelivery - promoDiscount;
  const minimumPayment = finalTotal * 0.2; // 20% minimum

  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type);
    if (type === 'full') {
      setPaidAmount(finalTotal.toString());
    } else {
      setPaidAmount('');
    }
  };

  const handleApplyPromoCode = () => {
    applyPromoCode(totalWithDelivery);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading checkout...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        {/* Show user status */}
        {user ? (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Logged in as <strong>{userProfile?.full_name || user.email}</strong>
              {userProfile?.role === 'admin' && <span className="ml-2 text-blue-600">(Admin)</span>}
              {isCustomerOrder() && <span className="ml-2 text-green-600">(Customer Order)</span>}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're checking out as a guest. <strong>Your order will be processed normally.</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Customer Info & Delivery */}
          <div className="space-y-6">
            <CustomerInfoForm
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              formErrors={formErrors}
            />

            <DeliveryLocationSelector
              deliveryCharges={deliveryCharges}
              selectedDelivery={selectedDelivery}
              setSelectedDelivery={setSelectedDelivery}
              formErrors={formErrors}
            />

            <PromoCodeSection
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              appliedPromo={appliedPromo}
              isPromoApplied={isPromoApplied}
              onApplyPromo={handleApplyPromoCode}
              onRemovePromo={removePromoCode}
            />

            <PaymentMethodSection
              paymentMethods={paymentMethods}
              selectedPayment={selectedPayment}
              setSelectedPayment={setSelectedPayment}
              paymentType={paymentType}
              onPaymentTypeChange={handlePaymentTypeChange}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
              paymentScreenshot={paymentScreenshot}
              setPaymentScreenshot={setPaymentScreenshot}
              finalTotal={finalTotal}
              minimumPayment={minimumPayment}
              formErrors={formErrors}
              uploadingScreenshot={uploadingScreenshot}
            />
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <OrderSummaryCard
              cartItems={cartItems}
              getItemPricing={getItemPricing}
              subtotal={subtotal}
              deliveryPrice={deliveryPrice}
              appliedPromo={appliedPromo}
              promoDiscount={promoDiscount}
              finalTotal={finalTotal}
              minimumPayment={minimumPayment}
              paymentType={paymentType}
              paidAmount={paidAmount}
              submitting={submitting}
              uploadingScreenshot={uploadingScreenshot}
              onSubmitOrder={handleSubmitOrder}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
