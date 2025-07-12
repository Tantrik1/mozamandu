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
import { useComboManager } from '@/hooks/useComboManager';

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
  
  // Combo management integration
  const { 
    activeCombo, 
    isComboActive, 
    getComboPrice, 
    shouldIgnoreMinimumQuantity 
  } = useComboManager({ cartItems });
  
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

  // Enhanced tiered pricing integration with combo support
  const {
    subcategoryPricing,
    getTotalPrice: getTieredTotalPrice,
    getTotalSavings,
    getComboInfo,
    isComboModeActive
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
    activeCombo,
    discountTiers
  });

  useEffect(() => {
    if (isComboModeActive()) {
      const comboInfo = getComboInfo();
      console.log('🎯 Combo mode is active in checkout:', comboInfo);
    }
  }, [isComboModeActive, getComboInfo]);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
      return;
    }
    
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
      
      const { data: deliveryData } = await supabase
        .from('delivery_charges')
        .select('*')
        .eq('is_active', true)
        .order('place_name');
      
      const { data: paymentData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

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

  const getBucketName = () => {
    if (!user) return 'guest-payments';
    if (userProfile?.role === 'admin') return 'admin-payments';
    return 'customer-payments';
  };

  const isCustomerOrder = () => {
    return user && userProfile?.role !== 'admin';
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!customerInfo.name.trim()) errors.name = 'Name is required';
    if (!customerInfo.email.trim()) errors.email = 'Email is required';
    if (!customerInfo.contact.trim()) errors.contact = 'Contact number is required';
    if (!customerInfo.address.trim()) errors.address = 'Delivery address is required';
    if (!selectedDelivery) errors.delivery = 'Please select delivery location';
    if (!selectedPayment) errors.payment = 'Please select payment method';

    if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (paymentType === 'partial') {
      if (!paidAmount || parseFloat(paidAmount) <= 0) {
        errors.paidAmount = 'Please enter a valid payment amount';
      }
    }

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
      console.log('🎯 Combo mode active:', isComboModeActive());
      if (isComboModeActive()) {
        console.log('🎯 Combo details:', getComboInfo());
      }

      const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
      const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
      const subtotal = getTieredTotalPrice();
      const totalWithDelivery = subtotal + deliveryPrice;
      const promoDiscount = appliedPromo 
        ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 
        : 0;
      const finalTotal = totalWithDelivery - promoDiscount;
      const actualPaidAmount = paymentType === 'full' ? finalTotal : parseFloat(paidAmount);

      let paymentScreenshotUrl = null;
      if (paymentScreenshot) {
        paymentScreenshotUrl = await uploadPaymentScreenshot();
        if (!paymentScreenshotUrl) {
          console.warn('Payment screenshot upload failed, but continuing with order');
        }
      }

      // Create serializable pricing breakdown for JSON storage
      const comboInfo = isComboModeActive() ? getComboInfo() : null;
      const serializablePricingBreakdown = {
        subtotal,
        deliveryPrice,
        promoDiscount,
        finalTotal,
        comboActive: isComboModeActive(),
        comboInfo: comboInfo ? {
          combo: {
            id: comboInfo.combo.id,
            name: comboInfo.combo.name,
            description: comboInfo.combo.description
          },
          totalComboSavings: comboInfo.totalComboSavings,
          affectedSubcategories: comboInfo.affectedSubcategories.map(sub => ({
            subcategoryId: sub.subcategoryId,
            totalQuantity: sub.totalQuantity,
            comboActive: sub.comboActive,
            comboPrice: sub.comboPrice,
            totalSavings: sub.totalSavings,
            description: sub.description
          }))
        } : null,
        subcategoryBreakdown: Object.fromEntries(
          Object.entries(subcategoryPricing).map(([key, value]) => [
            key,
            {
              subcategoryId: value.subcategoryId,
              totalQuantity: value.totalQuantity,
              moqReached: value.moqReached,
              moqRequired: value.moqRequired,
              comboActive: value.comboActive,
              comboPrice: value.comboPrice,
              totalSavings: value.totalSavings,
              description: value.description,
              itemBreakdown: value.itemBreakdown.map(item => ({
                itemId: item.itemId,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                appliedTier: item.appliedTier,
                tierInfo: item.tierInfo,
                savings: item.savings
              }))
            }
          ])
        )
      };

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
        combo_applied: isComboModeActive(),
        promocode_used: appliedPromo?.code || null,
        promocode_discount: promoDiscount,
        pricing_breakdown: serializablePricingBreakdown
      };

      let orderResult = null;

      if (isCustomerOrder()) {
        console.log('Creating customer order with combo support...');
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
        console.log('Creating regular order with combo support...');
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

      // Create order items with proper separation of data
      const orderItems = [];
      const orderItemDetails = [];
      const orderItemsTable = isCustomerOrder() ? 'customer_order_items' : 'order_items';
      const orderItemDetailsTable = isCustomerOrder() ? 'customer_order_item_details' : 'order_item_details';

      for (const item of cartItems) {
        // ORDER ITEMS - Only basic product and quantity info
        const orderItem = {
          order_id: orderResult.id,
          product_id: item.productId,
          quantity: item.quantity
        };
        orderItems.push(orderItem);

        // ORDER ITEM DETAILS - All detailed information including variants
        let itemSku = `${item.productName.substring(0, 3).toUpperCase()}`;
        if (item.colorName) itemSku += `-${item.colorName.substring(0, 2).toUpperCase()}`;
        if (item.sizeName) itemSku += `-${item.sizeName}`;

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
          product_inventory_id: null, // This would need to be resolved from the variant IDs
          pricing_details: itemPricing ? {
            tierInfo: itemPricing.tierInfo,
            savings: itemPricing.savings,
            appliedTier: itemPricing.appliedTier,
            comboActive: pricingInfo?.comboActive || false,
            comboPrice: pricingInfo?.comboPrice || null
          } : null
        };

        orderItemDetails.push(orderItemDetail);
      }

      console.log(`Creating ${orderItems.length} order items in ${orderItemsTable}`);
      console.log(`Creating ${orderItemDetails.length} order item details in ${orderItemDetailsTable}`);

      // Insert order items (basic info only)
      const { error: itemsError } = await supabase
        .from(orderItemsTable)
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        const deleteTable = isCustomerOrder() ? 'customer_orders' : 'orders';
        await supabase.from(deleteTable).delete().eq('id', orderResult.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      // Create order item details (detailed info)
      const { error: detailsError } = await supabase
        .from(orderItemDetailsTable)
        .insert(orderItemDetails);

      if (detailsError) {
        console.error('Order item details creation error:', detailsError);
        // Don't fail the order for this, just log the error
        console.warn('Order created but item details may be incomplete');
      }

      console.log('Order items created successfully with combo pricing support');

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

      clearCart();
      
      const orderMessage = isComboModeActive() 
        ? `Your order #${orderResult.order_number} has been placed successfully with combo pricing!`
        : `Your order #${orderResult.order_number} has been placed successfully.`;
      
      toast({
        title: "Order Placed Successfully!",
        description: orderMessage,
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

  const selectedDeliveryCharge = deliveryCharges.find(d => d.id === selectedDelivery);
  const deliveryPrice = selectedDeliveryCharge?.delivery_price || 0;
  const subtotal = getTieredTotalPrice();
  const totalWithDelivery = subtotal + deliveryPrice;
  const promoDiscount = appliedPromo 
    ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 
    : 0;
  const finalTotal = totalWithDelivery - promoDiscount;
  const minimumPayment = finalTotal * 0.2;
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

        {/* User status alert with combo information */}
        {user ? (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Logged in as <strong>{userProfile?.full_name || user.email}</strong>
              {userProfile?.role === 'admin' && <span className="ml-2 text-blue-600">(Admin)</span>}
              {isCustomerOrder() && <span className="ml-2 text-green-600">(Customer Order)</span>}
              {isComboModeActive() && (
                <span className="ml-2 text-purple-600 font-semibold">
                  🎯 Combo Active: {activeCombo?.name}
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're checking out as a guest. <strong>Your order will be processed normally.</strong>
              {isComboModeActive() && (
                <span className="ml-2 text-purple-600 font-semibold">
                  🎯 Combo Active: {activeCombo?.name}
                </span>
              )}
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
                comboInfo={isComboModeActive() ? getComboInfo() : null}
              />
            </div>
          </div>
        </div>

        {/* Mobile sticky order summary */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Total: Rs. {finalTotal.toFixed(2)}</span>
            <div className="flex items-center space-x-2">
              {totalSavings > 0 && (
                <span className="text-green-600 text-sm">Save Rs. {totalSavings.toFixed(2)}</span>
              )}
              {isComboModeActive() && (
                <span className="text-purple-600 text-xs font-semibold">🎯 Combo</span>
              )}
            </div>
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
