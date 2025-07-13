import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerInfoForm } from './CustomerInfoForm';
import { PaymentMethodSection } from './PaymentMethodSection';
import { PromoCodeSection } from './PromoCodeSection';
import { CleanOrderSummary } from './CleanOrderSummary';
import { CheckoutSuccess } from './CheckoutSuccess';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRobustCart } from '@/hooks/useRobustCart';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { useComboManager } from '@/hooks/useComboManager';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { toast } from 'sonner';
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
  const { user } = useAuth();
  const { getInventoryRecord, validateStockAvailability, reserveStock } = useInventoryManager();
  
  const {
    cartItems,
    clearCart
  } = useRobustCart();

  // Initialize discount tiers state first
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: any[] }>({});

  // Use the EXACT same combo management as CartSidebar
  const { 
    activeCombo, 
    isComboActive, 
    getComboPrice, 
    shouldIgnoreMinimumQuantity 
  } = useComboManager({ cartItems });

  // Use the EXACT same tiered pricing hook as CartSidebar
  const {
    getTotalPrice: getTieredTotalPrice,
    getItemPricing: getTieredItemPricing,
    subcategoryPricing,
    getTotalSavings,
    getComboInfo,
    isComboModeActive
  } = useSubcategoryTieredPricing({
    cartItems,
    activeCombo,
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
  const [paymentPercentage, setPaymentPercentage] = useState(100);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  useEffect(() => {
    fetchDeliveryLocations();
    fetchPaymentMethods();
    fetchDiscountTiers();
  }, []);

  useEffect(() => {
    if (appliedPromo) {
      calculatePromoDiscount();
    } else {
      setPromoDiscount(0);
    }
  }, [appliedPromo, cartItems]);

  // Debug combo activation - EXACT same as CartSidebar
  useEffect(() => {
    console.log('🎯 UniversalCheckout Debug - Combo Status:');
    console.log('Active combo:', activeCombo);
    console.log('Is combo mode active:', isComboModeActive());
    console.log('Cart items count:', cartItems.length);
    
    if (activeCombo) {
      console.log('Combo requirements:', activeCombo.combo_subcategories);
      
      // Check subcategory quantities
      const subcategoryCounts: { [key: string]: number } = {};
      cartItems.forEach(item => {
        subcategoryCounts[item.subcategoryId] = (subcategoryCounts[item.subcategoryId] || 0) + item.quantity;
      });
      console.log('Current subcategory quantities:', subcategoryCounts);
      
      // Check if combo requirements are met
      activeCombo.combo_subcategories.forEach(req => {
        const currentQty = subcategoryCounts[req.subcategory_id] || 0;
        console.log(`Subcategory ${req.subcategory_id}: needs ${req.min_units}, has ${currentQty}`);
      });
    }
  }, [activeCombo, cartItems, isComboModeActive]);

  const fetchDeliveryLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('*')
        .order('place_name');

      if (error) {
        throw error;
      }

      setDeliveryLocations(data || []);
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
      toast.error('Failed to load delivery options.');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods.');
    }
  };

  const fetchDiscountTiers = async () => {
    try {
      const { data } = await supabase
        .from('discount_tiers')
        .select('*')
        .order('subcategory_id, min_quantity');
      
      if (data) {
        const tiersBySubcategory: { [key: string]: any[] } = {};
        data.forEach(tier => {
          if (!tiersBySubcategory[tier.subcategory_id]) {
            tiersBySubcategory[tier.subcategory_id] = [];
          }
          tiersBySubcategory[tier.subcategory_id].push(tier);
        });
        setDiscountTiers(tiersBySubcategory);
      }
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
    }
  };

  const calculatePromoDiscount = () => {
    if (appliedPromo) {
      // Use the EXACT same tiered pricing calculation as cart
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
      
      // Enhanced validation checks
      if (!customerInfo.name.trim()) {
        toast.error('Please enter your name');
        return;
      }

      if (!customerInfo.email.trim()) {
        toast.error('Please enter your email');
        return;
      }

      if (!customerInfo.phone.trim()) {
        toast.error('Please enter your phone number');
        return;
      }

      if (!customerInfo.address.trim()) {
        toast.error('Please enter your delivery address');
        return;
      }

      if (!deliveryLocation) {
        toast.error('Please select a delivery location');
        return;
      }

      if (!paymentMethod) {
        toast.error('Please select a payment method');  
        return;
      }

      // Pre-validate cart items format
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

      // Enhanced stock validation with detailed logging
      console.log('🔍 Starting comprehensive stock validation...');
      try {
        await validateStockAvailability(validCartItems);
        console.log('✅ Stock validation passed for all items');
      } catch (stockError) {
        console.error('❌ Stock validation failed:', stockError);
        toast.error(`Stock validation failed: ${stockError.message}`);
        return;
      }

      // Get inventory records with enhanced validation and error handling
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

          // Validate stock availability one more time
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
          toast.error(itemError.message);
          return;
        }
      }

      console.log('✅ All inventory records validated:', cartItemsWithInventory.length, 'items');

      // Calculate pricing using the same hooks as cart
      const accurateSubtotal = getTieredTotalPrice();
      const accurateSavings = getTotalSavings();
      const comboInfo = getComboInfo();
      const isComboActive = isComboModeActive();
      
      console.log('💰 Pricing details:', {
        accurateSubtotal,
        accurateSavings,
        comboInfo,
        isComboActive,
        subcategoryPricing
      });

      const totalBeforeDelivery = accurateSubtotal - promoDiscount;
      const finalTotal = totalBeforeDelivery + deliveryLocation.delivery_price;
      const paidAmount = Math.round(finalTotal * (paymentPercentage / 100));
      const remainingAmount = finalTotal - paidAmount;

      // Create comprehensive pricing breakdown
      const pricingBreakdown = {
        subcategoryPricing: Object.fromEntries(
          Object.entries(subcategoryPricing).map(([id, data]) => [
            id,
            {
              subcategoryId: data.subcategoryId,
              totalQuantity: data.totalQuantity,
              moqReached: data.moqReached,
              moqRequired: data.moqRequired,
              comboActive: data.comboActive,
              comboPrice: data.comboPrice || 0,
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
        finalTotal,
        comboInfo: isComboActive && comboInfo ? {
          combo: {
            id: comboInfo.combo.id,
            name: comboInfo.combo.name,
            description: comboInfo.combo.description
          },
          totalComboSavings: comboInfo.totalComboSavings || 0
        } : null,
        pricingMode: isComboActive ? 'combo' : (accurateSavings > 0 ? 'moq_discount' : 'normal')
      };

      console.log('📋 Enhanced pricing breakdown:', pricingBreakdown);

      // Create order with enhanced error handling - CRITICAL FIX for guest orders
      console.log('📝 Creating order with validated inventory data...');
      
      // Prepare order data with proper user_id handling and status typing
      const orderData = {
        // CRITICAL: Set user_id to null for guest orders explicitly
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
        total_amount: finalTotal,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        payment_percentage: paymentPercentage,
        payment_method_id: paymentMethod.id,
        payment_screenshot_url: paymentScreenshotUrl,
        combo_applied: isComboActive,
        pricing_breakdown: pricingBreakdown,
        status: 'pending_payment' as const
      };

      console.log('📋 Order data being sent:', orderData);
      
      const { data: createdOrder, error: orderError } = await supabase
        .from('customer_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Order creation error:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log('✅ Order created successfully:', createdOrder.id);

      // Insert basic order items for compatibility
      const orderItemsToInsert = cartItemsWithInventory.map(item => ({
        order_id: createdOrder.id,
        product_id: item.productId,
        quantity: item.quantity
      }));

      const { error: orderItemsError } = await supabase
        .from('customer_order_items')
        .insert(orderItemsToInsert);

      if (orderItemsError) {
        console.error('❌ Order items error:', orderItemsError);
        throw new Error(`Failed to create order items: ${orderItemsError.message}`);
      }

      // Insert detailed order item information with validated inventory IDs
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
            comboApplied: isComboActive,
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
        .from('customer_order_item_details')
        .insert(orderItemDetailsToInsert);

      if (orderItemDetailsError) {
        console.error('❌ Order item details error:', orderItemDetailsError);
        throw new Error(`Failed to create order item details: ${orderItemDetailsError.message}`);
      }

      // CRITICAL FIX: Reserve stock immediately after order creation
      console.log('🔒 Reserving stock immediately for order:', createdOrder.id);
      try {
        await reserveStock(createdOrder.id);
        console.log('✅ Stock reserved successfully for order:', createdOrder.id);
        toast.success('Stock has been reserved for your order!');
      } catch (reserveError) {
        console.error('❌ Failed to reserve stock:', reserveError);
        // Don't fail the entire order, but log the issue
        toast.error('Order created but stock reservation failed. Please contact support.');
      }

      console.log('🎉 Enhanced order completed successfully with immediate stock reservation!');
      
      // Clear cart and show success
      clearCart();
      setOrderId(createdOrder.id);
      setShowSuccess(true);
      toast.success('Order placed successfully! Stock has been reserved and order tracking is now active.');

    } catch (error) {
      console.error('💥 Enhanced order submission failed:', error);
      toast.error(`Failed to place order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use EXACT cart pricing calculations using SAME pricing hooks
  const totalSavings = getTotalSavings() + promoDiscount;
  const subtotal = getTieredTotalPrice();
  const totalBeforeDelivery = subtotal - promoDiscount;
  const finalTotal = totalBeforeDelivery + (deliveryLocation ? deliveryLocation.delivery_price : 0);

  console.log('🎯 Final checkout calculations:', {
    subtotal,
    totalSavings: getTotalSavings(),
    promoDiscount,
    finalTotal
  });

  if (showSuccess && orderId) {
    return <CheckoutSuccess orderId={orderId} />;
  }

  return (
    <div className="container mx-auto py-8 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-gray-600 mt-1">Complete your order below</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
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

          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-6">
              <PaymentMethodSection
                paymentMethods={paymentMethods}
                selectedPayment={paymentMethod?.id || ''}
                setSelectedPayment={(value) => {
                  const method = paymentMethods.find(m => m.id === value);
                  setPaymentMethod(method || null);
                }}
                paymentType={paymentPercentage === 100 ? 'full' : 'partial'}
                onPaymentTypeChange={(type) => {
                  setPaymentPercentage(type === 'full' ? 100 : 20);
                }}
                paidAmount={Math.round(finalTotal * (paymentPercentage / 100)).toString()}
                setPaidAmount={(value) => {
                  const amount = parseFloat(value);
                  const percentage = (amount / finalTotal) * 100;
                  setPaymentPercentage(Math.min(100, Math.max(20, percentage)));
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
            comboInfo={getComboInfo()}
            getTieredItemPricing={getTieredItemPricing}
            isComboModeActive={isComboModeActive()}
          />
        </div>
      </div>

      {/* Enhanced Mobile Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-50 shadow-2xl">
        <div className="container mx-auto">
          {/* Total and savings display */}
          {(getTotalSavings() + promoDiscount) > 0 && (
            <div className="text-center mb-3">
              <div className="text-green-600 font-semibold text-sm">
                🎉 You're saving Rs. {(getTotalSavings() + promoDiscount).toFixed(2)}!
              </div>
            </div>
          )}
          
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting || cartItems.length === 0}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
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
