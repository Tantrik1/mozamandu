
import { useState, useEffect } from 'react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';

import { usePromoCode } from '@/hooks/usePromoCode';
import { CustomerInfoForm } from './CustomerInfoForm';
import { DeliveryLocationSelector } from './DeliveryLocationSelector';
import { PromoCodeSection } from './PromoCodeSection';
import { PaymentMethodSection } from './PaymentMethodSection';
import { AdvancedOrderSummary } from './AdvancedOrderSummary';

interface FormErrors {
  [key: string]: string;
}

export function UniversalCheckout() {
  const { cartItems, getTotalPrice, clearCart } = useRobustCart();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [deliveryCharges, setDeliveryCharges] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [discountTiers, setDiscountTiers] = useState({});
  const [loading, setLoading] = useState(true);
  
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

  // Tiered pricing integration
  const {
    subcategoryPricing,
    getTotalPrice: getTieredTotalPrice,
    getTotalSavings
  } = useSubcategoryTieredPricing({
    cartItems: cartItems.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      colorVariantId: item.colorVariantId,
      sizeVariantId: item.sizeVariantId,
      colorName: item.colorName,
      sizeName: item.sizeName,
      quantity: item.quantity,
      basePrice: item.basePrice,
      subcategoryId: item.subcategoryId,
      image_url: item.imageUrl,
      addedOrder: item.addedOrder || 0
    })),
    activeCombo: null,
    discountTiers
  });

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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch delivery charges
      const { data: deliveryData } = await supabase
        .from('delivery_charges')
        .select('*')
        .eq('is_active', true)
        .order('place_name');
      
      // Fetch payment methods
      const { data: paymentData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Fetch discount tiers
      const { data: tiersData } = await supabase
        .from('discount_tiers')
        .select('*')
        .order('subcategory_id, min_quantity');

      setDeliveryCharges(deliveryData || []);
      setPaymentMethods(paymentData || []);
      
      if (tiersData) {
        const tiersBySubcategory = {};
        tiersData.forEach(tier => {
          if (!tiersBySubcategory[tier.subcategory_id]) {
            tiersBySubcategory[tier.subcategory_id] = [];
          }
          tiersBySubcategory[tier.subcategory_id].push(tier);
        });
        setDiscountTiers(tiersBySubcategory);
      }
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load checkout data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine which bucket to use based on user type
  const getBucketName = () => {
    if (!user) return 'guest-payments';
    if (userProfile?.role === 'admin') return 'admin-payments';
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

    // Payment screenshot is required
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
        description: "Failed to upload payment screenshot",
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

      const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
      const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
      const subtotal = getTieredTotalPrice();
      const totalWithDelivery = subtotal + deliveryPrice;
      const promoDiscount = appliedPromo 
        ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 
        : 0;
      const finalTotal = totalWithDelivery - promoDiscount;
      const actualPaidAmount = paymentType === 'full' ? finalTotal : parseFloat(paidAmount);

      // Upload payment screenshot
      let paymentScreenshotUrl = null;
      if (paymentScreenshot) {
        paymentScreenshotUrl = await uploadPaymentScreenshot();
        if (!paymentScreenshotUrl) {
          console.warn('Payment screenshot upload failed, but continuing with order');
        }
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

      // Submit to appropriate table
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
      } else {
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
          throw new Error(`Order creation failed: ${orderError.message}`);
        }

        orderResult = order;
      }

      if (!orderResult) {
        throw new Error('Order was not created properly');
      }

      // Create order items with detailed information
      const orderItems = [];
      const orderItemDetails = [];
      const orderItemsTable = isCustomerOrder() ? 'customer_order_items' : 'order_items';
      const orderItemDetailsTable = isCustomerOrder() ? 'customer_order_item_details' : 'order_item_details';

      for (const item of cartItems) {
        // Get SKU from inventory
        let itemSku = `${item.productName.substring(0, 3).toUpperCase()}`;
        if (item.colorName) itemSku += `-${item.colorName.substring(0, 2).toUpperCase()}`;
        if (item.sizeName) itemSku += `-${item.sizeName}`;

        const orderItem = {
          order_id: orderResult.id,
          product_id: item.productId,
          color_variant_id: item.colorVariantId,
          size_variant_id: item.sizeVariantId,
          quantity: item.quantity
        };

        orderItems.push(orderItem);

        // Get pricing info from tiered pricing
        const pricingInfo = subcategoryPricing[item.subcategoryId];
        const itemPricing = pricingInfo?.itemBreakdown.find(breakdown => breakdown.itemId === item.id);
        
        const orderItemDetail = {
          order_id: orderResult.id,
          product_name: item.productName,
          color_name: item.colorName || '',
          size_name: item.sizeName || '',
          quantity: item.quantity,
          unit_price: itemPricing?.unitPrice || item.unitPrice,
          total_price: itemPricing?.totalPrice || (item.unitPrice * item.quantity),
          pricing_mode: itemPricing?.appliedTier || 'normal',
          sku: itemSku,
          pricing_details: itemPricing ? {
            tierInfo: itemPricing.tierInfo,
            savings: itemPricing.savings,
            appliedTier: itemPricing.appliedTier
          } : null
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
      }

      console.log('Order items created successfully');

      // Send order creation email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-order-email', {
          body: {
            type: 'order_created',
            orderId: orderResult.id,
            isCustomerOrder: isCustomerOrder()
          }
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }

      // Clear cart and redirect
      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${orderResult.order_number} has been placed successfully.`,
      });

      const summaryRoute = isCustomerOrder() ? 'customer-order-summary' : 'order-summary';
      navigate(`/${summaryRoute}/${orderResult.id}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals with tiered pricing
  const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
  const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
  const subtotal = getTieredTotalPrice();
  const totalWithDelivery = subtotal + deliveryPrice;
  const promoDiscount = appliedPromo 
    ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 
    : 0;
  const finalTotal = totalWithDelivery - promoDiscount;
  const minimumPayment = finalTotal * 0.2; // 20% minimum
  const totalSavings = getTotalSavings();

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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        {/* User status alert */}
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

        {/* Main checkout layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
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

          {/* Right Column - Order Summary (1/3 width on desktop, sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <AdvancedOrderSummary
                cartItems={cartItems}
                subcategoryPricing={subcategoryPricing}
                deliveryCharge={deliveryPrice}
                promoCode={appliedPromo}
                promoDiscount={promoDiscount}
                totalSavings={totalSavings}
                finalTotal={finalTotal}
                isSubmitting={submitting}
                onSubmitOrder={handleSubmitOrder}
              />
            </div>
          </div>
        </div>

        {/* Mobile sticky order summary */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Total: Rs. {finalTotal.toFixed(2)}</span>
            {totalSavings > 0 && (
              <span className="text-green-600 text-sm">Save Rs. {totalSavings.toFixed(2)}</span>
            )}
          </div>
          <Button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </div>

        {/* Add bottom padding on mobile to account for sticky summary */}
        <div className="lg:hidden h-24"></div>
      </div>
    </div>
  );
}
