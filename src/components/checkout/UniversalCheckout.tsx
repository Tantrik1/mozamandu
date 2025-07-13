
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomerInfoForm } from './CustomerInfoForm';
import { PaymentMethodSection } from './PaymentMethodSection';
import { PromoCodeSection } from './PromoCodeSection';
import { AdvancedOrderSummary } from './AdvancedOrderSummary';
import { CheckoutSuccess } from './CheckoutSuccess';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRobustCart } from '@/hooks/useRobustCart';
import { usePromoCode } from '@/hooks/usePromoCode';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { toast } from 'sonner';

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

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
  image_url?: string;
  sku?: string;
  inventoryId?: string;
  addedOrder: number; // Order in which item was added to cart
}

interface ComboData {
  id: string;
  name: string;
  description: string;
  combo_subcategories: {
    subcategory_id: string;
    min_units: number;
    price: number;
  }[];
}

interface DiscountTier {
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

export function UniversalCheckout() {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentPercentage, setPaymentPercentage] = useState(100);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: DiscountTier[] }>({});
  const [activePromoCode, setActivePromoCode] = useState<PromoCode | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [activeCombo, setActiveCombo] = useState<ComboData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const {
    cartItems,
    clearCart,
    getCartTotal
  } = useRobustCart();

  const {
    subcategoryPricing,
    getTotalPrice,
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

  useEffect(() => {
    fetchDeliveryLocations();
    fetchPaymentMethods();
    fetchDiscountTiers();
    fetchActiveCombo();
  }, []);

  useEffect(() => {
    if (appliedPromo) {
      calculatePromoDiscount();
    } else {
      setPromoDiscount(0);
    }
  }, [appliedPromo, cartItems]);

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
        const tiersBySubcategory: { [key: string]: DiscountTier[] } = {};
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

  const fetchActiveCombo = async () => {
    try {
      const { data } = await supabase
        .from('combos')
        .select(`
          *,
          combo_subcategories (
            subcategory_id,
            min_units,
            price
          )
        `)
        .eq('status', 'active')
        .maybeSingle();
      
      setActiveCombo(data);
    } catch (error) {
      console.error('Error fetching active combo:', error);
    }
  };

  const calculatePromoDiscount = () => {
    if (appliedPromo) {
      const subtotal = getTotalPrice();
      const discount = (subtotal * appliedPromo.discount_percentage) / 100;
      setPromoDiscount(discount);
    } else {
      setPromoDiscount(0);
    }
  };

  const handlePromoCodeApplied = (promoCode: PromoCode) => {
    const totalWithDelivery = getTotalPrice() + (deliveryLocation ? deliveryLocation.delivery_price : 0);
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
      console.log('🚀 Starting order submission process...');
      
      if (!deliveryLocation) {
        toast.error('Please select a delivery location');
        return;
      }

      if (!paymentMethod) {
        toast.error('Please select a payment method');  
        return;
      }

      const tieredSubtotal = getTotalPrice();
      const tieredSavings = getTotalSavings();
      const comboInfo = getComboInfo();
      const isComboActive = isComboModeActive();
      
      console.log('💰 Pricing details:', {
        tieredSubtotal,
        tieredSavings,
        comboInfo,
        isComboActive,
        subcategoryPricing
      });

      const totalBeforeDelivery = tieredSubtotal - promoDiscount;
      const finalTotal = totalBeforeDelivery + deliveryLocation.delivery_price;
      const paidAmount = Math.round(finalTotal * (paymentPercentage / 100));
      const remainingAmount = finalTotal - paidAmount;

      // Prepare simplified pricing breakdown for JSON storage
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
        tieredSubtotal,
        tieredSavings,
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
        pricingMode: isComboActive ? 'combo' : (tieredSavings > 0 ? 'moq_discount' : 'normal')
      };

      console.log('📋 Complete pricing breakdown:', pricingBreakdown);

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('customer_orders')
        .insert({
          user_id: user?.id || '',
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          contact_number: customerInfo.phone,
          whatsapp_number: customerInfo.whatsapp || null,
          delivery_address: customerInfo.address,
          delivery_location_id: deliveryLocation.id,
          delivery_charge: deliveryLocation.delivery_price,
          subtotal: tieredSubtotal,
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
          status: 'pending_payment'
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Order creation error:', orderError);
        throw orderError;
      }

      console.log('✅ Order created successfully:', orderData);

      // Insert order items (basic info only)
      const orderItemsToInsert = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        quantity: item.quantity
      }));

      const { error: orderItemsError } = await supabase
        .from('customer_order_items')
        .insert(orderItemsToInsert);

      if (orderItemsError) {
        console.error('❌ Order items error:', orderItemsError);
        throw orderItemsError;
      }

      // Insert detailed order item information with pricing details
      const orderItemDetailsToInsert = cartItems.map(item => {
        const pricingInfo = Object.values(subcategoryPricing)
          .find(sub => sub.itemBreakdown.some(breakdown => breakdown.itemId === item.id))
          ?.itemBreakdown.find(breakdown => breakdown.itemId === item.id);

        return {
          order_id: orderData.id,
          product_inventory_id: item.inventoryId || null,
          product_name: item.productName,
          color_name: item.colorName || null,
          size_name: item.sizeName || null,
          sku: item.sku || null,
          quantity: item.quantity,
          unit_price: pricingInfo?.unitPrice || item.basePrice,
          total_price: pricingInfo?.totalPrice || (item.basePrice * item.quantity),
          pricing_mode: pricingInfo?.appliedTier || 'normal',
          pricing_details: {
            appliedTier: pricingInfo?.appliedTier || 'normal',
            tierInfo: pricingInfo?.tierInfo || null,
            savings: pricingInfo?.savings || 0,
            basePrice: item.basePrice,
            subcategoryId: item.subcategoryId
          }
        };
      });

      console.log('📝 Order item details to insert:', orderItemDetailsToInsert);

      const { error: orderItemDetailsError } = await supabase
        .from('customer_order_item_details')
        .insert(orderItemDetailsToInsert);

      if (orderItemDetailsError) {
        console.error('❌ Order item details error:', orderItemDetailsError);
        throw orderItemDetailsError;
      }

      console.log('✅ Order completed successfully!');
      
      // Clear cart and show success
      clearCart();
      setOrderId(orderData.id);
      setShowSuccess(true);
      toast.success('Order placed successfully!');

    } catch (error) {
      console.error('💥 Order submission failed:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSavings = getTotalSavings() + promoDiscount;
  const subtotal = getTotalPrice();
  const totalBeforeDelivery = subtotal - promoDiscount;
  const finalTotal = totalBeforeDelivery + (deliveryLocation ? deliveryLocation.delivery_price : 0);

  if (showSuccess && orderId) {
    return <CheckoutSuccess orderId={orderId} />;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      <Card className="mb-6">
        <CardContent className="grid md:grid-cols-2 gap-4">
          <CustomerInfoForm
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            deliveryLocations={deliveryLocations}
            deliveryLocation={deliveryLocation}
            setDeliveryLocation={setDeliveryLocation}
          />
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
        promoCode={promoCode}
        setPromoCode={setPromoCode}
        appliedPromo={appliedPromo}
        isPromoApplied={isPromoApplied}
        onApplyPromo={() => handlePromoCodeApplied(appliedPromo!)}
        onRemovePromo={handlePromoCodeRemoved}
      />

      <AdvancedOrderSummary
        cartItems={cartItems}
        subcategoryPricing={subcategoryPricing}
        deliveryCharge={deliveryLocation ? deliveryLocation.delivery_price : 0}
        promoCode={appliedPromo}
        promoDiscount={promoDiscount}
        totalSavings={totalSavings}
        finalTotal={finalTotal}
        isSubmitting={isSubmitting}
        onSubmitOrder={handleSubmitOrder}
        comboInfo={getComboInfo()}
      />

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          By placing your order, you agree to our <a href="#" className="text-blue-600">Terms of Service</a> and <a href="#" className="text-blue-600">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
