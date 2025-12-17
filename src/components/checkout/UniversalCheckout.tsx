import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerInfoForm } from './CustomerInfoForm';
import { PaymentMethodSection } from './PaymentMethodSection';
import { PaymentScreenshotUpload } from './PaymentScreenshotUpload';
import { PromoCodeSection } from './PromoCodeSection';
import { CleanOrderSummary } from './CleanOrderSummary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRobustCart } from '@/hooks/useRobustCart';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { useToast } from '@/hooks/use-toast';
import { Package, Loader2 } from 'lucide-react';

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address: string;
}

interface DeliveryLocation {
  id: string;
  place_name: string;
  delivery_price: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  description?: string;
}

export function UniversalCheckout() {
  const { user, userProfile } = useAuth();
  const { getInventoryRecord, validateStockAvailability, reserveStock } = useInventoryManager();
  const { toast } = useToast();
  
  const {
    cartItems,
    clearCart
  } = useRobustCart();

  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: any[] }>({});

  const {
    getTotalPrice: getTieredTotalPrice,
    getItemPricing: getTieredItemPricing,
    subcategoryPricing,
    getTotalSavings
  } = useSubcategoryTieredPricing({
    cartItems,
    discountTiers
  });

  const {
    promoCode,
    setPromoCode,
    appliedPromo,
    isPromoApplied,
    applyPromoCode,
    removePromoCode
  } = usePromoCode();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    whatsapp: ''
  });
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [customPaidAmount, setCustomPaidAmount] = useState<string>('');
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Batch fetch all initial data in parallel for faster loading
  useEffect(() => {
    const fetchInitialData = async () => {
      const [deliveryData, paymentData, tiersData] = await Promise.all([
        supabase.from('delivery_charges').select('*').eq('is_active', true).order('place_name'),
        supabase.from('payment_methods').select('*').eq('is_active', true).order('name'),
        supabase.from('discount_tiers').select('*').order('subcategory_id, min_quantity')
      ]);

      if (deliveryData.data) setDeliveryLocations(deliveryData.data);
      if (paymentData.data) {
        setPaymentMethods(paymentData.data);
        // Auto-select first payment method
        if (paymentData.data.length > 0 && !paymentMethod) {
          setPaymentMethod(paymentData.data[0]);
        }
      }
      if (tiersData.data) {
        const tiersBySubcategory: { [key: string]: any[] } = {};
        tiersData.data.forEach(tier => {
          if (!tiersBySubcategory[tier.subcategory_id]) {
            tiersBySubcategory[tier.subcategory_id] = [];
          }
          tiersBySubcategory[tier.subcategory_id].push(tier);
        });
        setDiscountTiers(tiersBySubcategory);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (appliedPromo) {
      calculatePromoDiscount();
    } else {
      setPromoDiscount(0);
    }
  }, [appliedPromo, cartItems]);

  // Auto-fill customer info for authenticated users
  useEffect(() => {
    if (user && userProfile) {
      console.log('🔄 Auto-filling customer info for authenticated user');
      setCustomerInfo(prev => ({
        ...prev,
        name: userProfile.full_name || prev.name,
        email: user.email || prev.email,
        phone: userProfile.contact_number || prev.phone,
        whatsapp: userProfile.whatsapp_number || prev.whatsapp,
      }));
    }
  }, [user, userProfile]);


  // Individual fetch functions removed - now using batched fetch above


  const calculatePromoDiscount = () => {
    if (appliedPromo) {
      const accurateSubtotal = getTieredTotalPrice();
      const discount = (accurateSubtotal * appliedPromo.discount_percentage) / 100;
      setPromoDiscount(discount);
      console.log('🔢 Promo calculation - Subtotal:', accurateSubtotal, 'Discount:', discount);
    } else {
      setPromoDiscount(0);
    }
  };

  const handlePromoCodeApplied = (promoCode: PromoCode) => {
    const totalWithDelivery = getTieredTotalPrice() + (deliveryLocation ? deliveryLocation.delivery_price : 0);
    applyPromoCode(totalWithDelivery);
  };

  const handlePromoCodeRemoved = () => {
    removePromoCode();
  };

  const handlePaymentScreenshotUpload = (url: string) => {
    setPaymentScreenshotUrl(url);
  };

  const handleSubmitOrder = async () => {
    try {
      setIsSubmitting(true);
      console.log('🚀 Starting enhanced order submission with immediate stock reservation...');
      console.log('🔍 User status:', { isAuthenticated: !!user, userId: user?.id });
      
      if (!customerInfo.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter your name',
          variant: 'destructive',
        });
        return;
      }

      if (!customerInfo.email.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter your email',
          variant: 'destructive',
        });
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        });
        return;
      }

      if (!customerInfo.phone.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter your phone number',
          variant: 'destructive',
        });
        return;
      }

      if (!/^\d{10}$/.test(customerInfo.phone)) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid 10-digit phone number',
          variant: 'destructive',
        });
        return;
      }

      if (!customerInfo.address.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter your delivery address',
          variant: 'destructive',
        });
        return;
      }

      if (!deliveryLocation) {
        toast({
          title: 'Validation Error',
          description: 'Please select a delivery location',
          variant: 'destructive',
        });
        return;
      }

      if (!paymentScreenshotUrl) {
        toast({
          title: 'Validation Error',
          description: 'Please upload payment screenshot to complete your order',
          variant: 'destructive',
        });
        return;
      }
      if (!paymentMethod) {
        toast({
          title: 'Validation Error',
          description: 'Please select a payment method',
          variant: 'destructive',
        });
        return;
      }

      console.log('🔍 Pre-validating cart items format...');
      const validCartItems = cartItems.filter(item => {
        const isValid = item.productId && item.productName && item.quantity > 0;
        if (!isValid) {
          console.warn('❌ Invalid cart item:', item);
        }
        return isValid;
      });

      if (validCartItems.length === 0) {
        throw new Error('No valid items in cart for checkout');
      }

      console.log(`✅ Found ${validCartItems.length} valid cart items`);

      console.log('🔍 Starting comprehensive stock validation...');
      try {
        await validateStockAvailability(validCartItems);
        console.log('✅ Stock validation passed for all items');
      } catch (stockError) {
        console.error('❌ Stock validation failed:', stockError);
        toast({
          title: 'Stock Error',
          description: `Stock validation failed: ${stockError.message}`,
          variant: 'destructive',
        });
        return;
      }

      console.log('🔍 Retrieving inventory records for all items...');
      const cartItemsWithInventory = [];
      
      for (let i = 0; i < validCartItems.length; i++) {
        const item = validCartItems[i];
        console.log(`🔍 Processing item ${i + 1}/${validCartItems.length}: ${item.productName}`);
        
        try {
          const inventoryRecord = await getInventoryRecord(
            item.productId,
            item.colorVariantId,
            item.sizeVariantId
          );
          
          if (!inventoryRecord) {
            throw new Error(`Inventory record not found for ${item.productName}. This product may not be available for purchase.`);
          }

          if (inventoryRecord.available_stock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.productName}. Available: ${inventoryRecord.available_stock}, Required: ${item.quantity}`);
          }

          cartItemsWithInventory.push({
            ...item,
            inventoryId: inventoryRecord.id,
            sku: inventoryRecord.sku,
            availableStock: inventoryRecord.available_stock
          });

          console.log(`✅ Item ${i + 1} validated:`, {
            productName: item.productName,
            sku: inventoryRecord.sku,
            inventoryId: inventoryRecord.id,
            availableStock: inventoryRecord.available_stock
          });
        } catch (itemError) {
          console.error(`❌ Failed to process item ${item.productName}:`, itemError);
          toast({
            title: 'Item Error',
            description: itemError.message,
            variant: 'destructive',
          });
          return;
        }
      }

      console.log('✅ All inventory records validated:', cartItemsWithInventory.length, 'items');

      const accurateSubtotal = getTieredTotalPrice();
      const accurateSavings = getTotalSavings();
      
      console.log('💰 Pricing details:', {
        accurateSubtotal,
        accurateSavings,
        subcategoryPricing
      });

      const totalBeforeDelivery = accurateSubtotal - promoDiscount;
      const orderFinalTotal = totalBeforeDelivery + deliveryLocation.delivery_price;
      const minimumAmount = Math.round(orderFinalTotal * 0.2);
      
      // Calculate paid amount based on payment type
      let paidAmount: number;
      let paymentPercentageValue: number;
      
      if (paymentType === 'full') {
        paidAmount = orderFinalTotal;
        paymentPercentageValue = 100;
      } else {
        // For partial payment, use the custom amount entered by user
        paidAmount = parseFloat(customPaidAmount) || 0;
        paymentPercentageValue = Math.round((paidAmount / orderFinalTotal) * 100);
        
        // Validate minimum amount for partial payments
        if (paidAmount < minimumAmount) {
          toast({
            title: 'Validation Error',
            description: `Minimum payment amount is Rs. ${minimumAmount.toFixed(2)}`,
            variant: 'destructive',
          });
          return;
        }
        
        if (paidAmount > orderFinalTotal) {
          toast({
            title: 'Validation Error',
            description: `Payment amount cannot exceed total amount of Rs. ${orderFinalTotal.toFixed(2)}`,
            variant: 'destructive',
          });
          return;
        }
      }
      
      const remainingAmount = orderFinalTotal - paidAmount;

      const pricingBreakdown = {
        subcategoryPricing: Object.fromEntries(
          Object.entries(subcategoryPricing).map(([id, data]) => [
            id,
            {
              subcategoryId: data.subcategoryId,
              totalQuantity: data.totalQuantity,
              moqReached: data.moqReached,
              moqRequired: data.moqRequired,
              totalSavings: data.totalSavings,
              description: data.description,
              itemBreakdown: data.itemBreakdown.map(item => ({
                itemId: item.itemId,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                appliedTier: item.appliedTier,
                tierInfo: item.tierInfo || '',
                savings: item.savings
              }))
            }
          ])
        ),
        accurateSubtotal,
        accurateSavings,
        promoDiscount,
        deliveryCharge: deliveryLocation.delivery_price,
        finalTotal: orderFinalTotal,
        pricingMode: accurateSavings > 0 ? 'moq_discount' : 'normal'
      };

      console.log('📋 Enhanced pricing breakdown:', pricingBreakdown);

      console.log('📝 Creating order with validated inventory data...');
      
      // Determine which tables to use based on authentication status
      const isCustomerOrder = !!user;
      const ordersTable = isCustomerOrder ? 'customer_orders' : 'orders';
      const orderItemsTable = isCustomerOrder ? 'customer_order_items' : 'order_items';
      const orderItemDetailsTable = isCustomerOrder ? 'customer_order_item_details' : 'order_item_details';
      
      console.log(`📋 Using tables: ${ordersTable}, ${orderItemsTable}, ${orderItemDetailsTable} (isCustomerOrder: ${isCustomerOrder})`);
      
      const orderData = {
        user_id: user?.id || null,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        contact_number: customerInfo.phone,
        whatsapp_number: customerInfo.whatsapp || null,
        delivery_address: customerInfo.address,
        delivery_location_id: deliveryLocation.id,
        delivery_charge: deliveryLocation.delivery_price,
        subtotal: accurateSubtotal,
        promocode_used: appliedPromo?.code || null,
        promocode_discount: promoDiscount,
        total_amount: orderFinalTotal,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        payment_percentage: paymentPercentageValue,
        payment_method_id: paymentMethod.id,
        payment_screenshot_url: paymentScreenshotUrl,
        pricing_breakdown: pricingBreakdown,
        status: 'pending_payment' as const
      };

      console.log('📋 Order data being sent:', orderData);
      
      const { data: createdOrder, error: orderError } = await supabase
        .from(ordersTable)
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Order creation error:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log('✅ Order created successfully:', createdOrder.id);

      const orderItemsToInsert = cartItemsWithInventory.map(item => ({
        order_id: createdOrder.id,
        product_id: item.productId,
        quantity: item.quantity
      }));

      const { error: orderItemsError } = await supabase
        .from(orderItemsTable)
        .insert(orderItemsToInsert);

      if (orderItemsError) {
        console.error('❌ Order items error:', orderItemsError);
        throw new Error(`Failed to create order items: ${orderItemsError.message}`);
      }

      const orderItemDetailsToInsert = cartItemsWithInventory.map(item => {
        const pricingResult = getTieredItemPricing(item.id);
        const pricingInfo = pricingResult || {
          unitPrice: item.basePrice,
          totalPrice: item.basePrice * item.quantity,
          appliedTier: 'normal',
          savings: 0,
          tierInfo: undefined,
          subcategoryInfo: null
        };

        return {
          order_id: createdOrder.id,
          product_inventory_id: item.inventoryId,
          product_name: item.productName,
          color_name: item.colorName || null,
          size_name: item.sizeName || null,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: pricingInfo.unitPrice,
          total_price: pricingInfo.totalPrice,
          pricing_mode: pricingInfo.appliedTier || 'normal',
          pricing_details: {
            appliedTier: pricingInfo.appliedTier || 'normal',
            tierInfo: pricingInfo.tierInfo || null,
            savings: pricingInfo.savings || 0,
            basePrice: item.basePrice,
            subcategoryId: item.subcategoryId,
            
            discountApplied: (pricingInfo.savings || 0) > 0,
            inventoryId: item.inventoryId,
            moqPricingApplied: pricingInfo.appliedTier === 'discount',
            accurateUnitPrice: pricingInfo.unitPrice,
            accurateTotalPrice: pricingInfo.totalPrice,
            availableStock: item.availableStock
          }
        };
      });

      console.log('📝 Enhanced order item details with validated inventory IDs:', orderItemDetailsToInsert.length);

      const { error: orderItemDetailsError } = await supabase
        .from(orderItemDetailsTable)
        .insert(orderItemDetailsToInsert);

      if (orderItemDetailsError) {
        console.error('❌ Order item details error:', orderItemDetailsError);
        throw new Error(`Failed to create order item details: ${orderItemDetailsError.message}`);
      }

      console.log('🔒 Reserving stock immediately for order:', createdOrder.id);
      try {
        await reserveStock(createdOrder.id, isCustomerOrder);
        console.log('✅ Stock reserved successfully for order:', createdOrder.id);
        toast({
          title: 'Order Placed Successfully!',
          description: 'Stock has been reserved for your order!',
        });
      } catch (reserveError) {
        console.error('❌ Failed to reserve stock:', reserveError);
        toast({
          title: 'Order Created',
          description: 'Order created but stock reservation failed. Please contact support.',
          variant: 'destructive',
        });
      }

      console.log('🎉 Enhanced order completed successfully with immediate stock reservation!');
      
      // Send order confirmation email
      console.log('📧 Sending order confirmation email...');
      try {
        const { error: emailError } = await supabase.functions.invoke('send-order-email', {
          body: {
            type: 'order_created',
            orderId: createdOrder.id,
            isCustomerOrder: isCustomerOrder
          }
        });

        if (emailError) {
          console.error('❌ Email sending failed:', emailError);
          toast({
            title: 'Order Created!',
            description: 'Order placed successfully, but email notification failed.',
            variant: 'default',
          });
        } else {
          console.log('✅ Order confirmation email sent successfully');
        }
      } catch (emailError) {
        console.error('❌ Email function error:', emailError);
      }
      
      // Clear cart after successful order
      clearCart();
      
      // Redirect to thank you page instead of showing inline success
      window.location.href = `/thank-you/${createdOrder.id}`;

    } catch (error) {
      console.error('💥 Enhanced order submission failed:', error);
      toast({
        title: 'Order Failed',
        description: `Failed to place order: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSavings = getTotalSavings() + promoDiscount;
  const subtotal = getTieredTotalPrice();
  const totalBeforeDelivery = subtotal - promoDiscount;
  const finalTotal = totalBeforeDelivery + (deliveryLocation ? deliveryLocation.delivery_price : 0);

  // Remove the showSuccess condition since we're redirecting to thank you page
  
  return (
    <div className="container mx-auto py-8 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
        <p className="text-muted-foreground mt-1">Complete your order below</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <CustomerInfoForm
                customerInfo={customerInfo}
                setCustomerInfo={setCustomerInfo}
                deliveryLocations={deliveryLocations}
                deliveryLocation={deliveryLocation}
                setDeliveryLocation={setDeliveryLocation}
              />
            </CardContent>
          </Card>

          <PromoCodeSection
            onDiscountApplied={setPromoDiscount}
            onPromoCodeUsed={(code) => {}}
            orderTotal={getTieredTotalPrice() + (deliveryLocation ? deliveryLocation.delivery_price : 0)}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            appliedPromo={appliedPromo}
            isPromoApplied={isPromoApplied}
            onApplyPromo={() => handlePromoCodeApplied(appliedPromo!)}
            onRemovePromo={handlePromoCodeRemoved}
          />

          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <PaymentMethodSection
                paymentMethods={paymentMethods}
                selectedPayment={paymentMethod?.id || ''}
                setSelectedPayment={(value) => {
                  const method = paymentMethods.find(m => m.id === value);
                  setPaymentMethod(method || null);
                }}
                paymentType={paymentType}
                onPaymentTypeChange={(type) => {
                  setPaymentType(type as 'full' | 'partial');
                  if (type === 'full') {
                    setCustomPaidAmount('');
                  } else {
                    // Set default to minimum amount when switching to partial
                    setCustomPaidAmount(Math.round(finalTotal * 0.2).toString());
                  }
                }}
                paidAmount={paymentType === 'full' ? finalTotal.toString() : customPaidAmount}
                setPaidAmount={(value) => {
                  setCustomPaidAmount(value);
                }}
                paymentScreenshot={null}
                setPaymentScreenshot={() => {}}
                finalTotal={finalTotal}
                minimumPayment={finalTotal * 0.2}
                formErrors={{}}
                uploadingScreenshot={false}
              />
            </CardContent>
          </Card>

          {/* Payment Screenshot Upload */}
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <PaymentScreenshotUpload
                onUploadComplete={handlePaymentScreenshotUpload}
                currentImageUrl={paymentScreenshotUrl || undefined}
                onRemove={() => setPaymentScreenshotUrl(null)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <CleanOrderSummary
            cartItems={cartItems}
            subcategoryPricing={subcategoryPricing}
            deliveryCharge={deliveryLocation ? deliveryLocation.delivery_price : 0}
            promoCode={appliedPromo}
            promoDiscount={promoDiscount}
            totalSavings={getTotalSavings()}
            finalTotal={finalTotal}
            isSubmitting={isSubmitting}
            onSubmitOrder={handleSubmitOrder}
            getTieredItemPricing={getTieredItemPricing}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 lg:hidden z-50 shadow-2xl">
        <div className="container mx-auto">
          {(getTotalSavings() + promoDiscount) > 0 && (
            <div className="text-center mb-3">
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                🎉 You're saving Rs. {(getTotalSavings() + promoDiscount).toFixed(2)}!
              </div>
            </div>
          )}
          
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting || cartItems.length === 0 || !paymentScreenshotUrl}
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing Order...
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Complete Order
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-lg">
                  Rs. {finalTotal.toFixed(2)}
                </div>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
