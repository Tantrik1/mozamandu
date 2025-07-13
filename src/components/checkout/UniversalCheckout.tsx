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
  addedOrder: number;
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
  const { getInventoryRecord } = useInventoryManager();
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
      // Use the accurate tiered pricing for promo calculation
      const accurateSubtotal = getTotalPrice();
      const discount = (accurateSubtotal * appliedPromo.discount_percentage) / 100;
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
      console.log('🚀 Starting order submission with accurate MOQ pricing matching cart...');
      
      // Validation checks
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

      // Get inventory records for all cart items with enhanced validation
      const cartItemsWithInventory = await Promise.all(
        cartItems.map(async (item) => {
          const inventoryRecord = await getInventoryRecord(
            item.productId,
            item.colorVariantId,
            item.sizeVariantId
          );
          
          if (!inventoryRecord) {
            throw new Error(`Inventory record not found for ${item.productName}`);
          }

          // Validate stock availability before proceeding
          if (inventoryRecord.available_stock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.productName}. Available: ${inventoryRecord.available_stock}, Required: ${item.quantity}`);
          }

          return {
            ...item,
            inventoryId: inventoryRecord.id,
            sku: inventoryRecord.sku
          };
        })
      );

      console.log('📦 Cart items with inventory validated:', cartItemsWithInventory);

      // Calculate accurate pricing details using the exact same logic as cart
      const accurateSubtotal = getTotalPrice(); // This matches cart calculation exactly
      const accurateSavings = getTotalSavings();
      const comboInfo = getComboInfo();
      const isComboActive = isComboModeActive();
      
      console.log('💰 Accurate pricing details matching cart:', {
        accurateSubtotal,
        accurateSavings,
        comboInfo,
        isComboActive,
        subcategoryPricing
      });

      // Use accurate pricing for final calculations
      const totalBeforeDelivery = accurateSubtotal - promoDiscount;
      const finalTotal = totalBeforeDelivery + deliveryLocation.delivery_price;
      const paidAmount = Math.round(finalTotal * (paymentPercentage / 100));
      const remainingAmount = finalTotal - paidAmount;

      // Create comprehensive pricing breakdown with accurate MOQ details
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
        accurateSubtotal, // Use accurate subtotal
        accurateSavings,  // Use accurate savings
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

      console.log('📋 Accurate pricing breakdown matching cart:', pricingBreakdown);

      // Create order with accurate pricing data
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
          subtotal: accurateSubtotal, // Use accurate subtotal
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

      console.log('✅ Order created successfully with accurate pricing:', orderData);

      // Insert basic order items for compatibility
      const orderItemsToInsert = cartItemsWithInventory.map(item => ({
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

      // Insert detailed order item information with accurate MOQ pricing per inventory ID
      const orderItemDetailsToInsert = cartItemsWithInventory.map(item => {
        const pricingInfo = Object.values(subcategoryPricing)
          .find(sub => sub.itemBreakdown.some(breakdown => breakdown.itemId === item.id))
          ?.itemBreakdown.find(breakdown => breakdown.itemId === item.id);

        return {
          order_id: orderData.id,
          product_inventory_id: item.inventoryId,
          product_name: item.productName,
          color_name: item.colorName || null,
          size_name: item.sizeName || null,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: pricingInfo?.unitPrice || item.basePrice,
          total_price: pricingInfo?.totalPrice || (item.basePrice * item.quantity),
          pricing_mode: pricingInfo?.appliedTier || 'normal',
          pricing_details: {
            appliedTier: pricingInfo?.appliedTier || 'normal',
            tierInfo: pricingInfo?.tierInfo || null,
            savings: pricingInfo?.savings || 0,
            basePrice: item.basePrice,
            subcategoryId: item.subcategoryId,
            comboApplied: isComboActive,
            discountApplied: (pricingInfo?.savings || 0) > 0,
            inventoryId: item.inventoryId,
            moqPricingApplied: pricingInfo?.appliedTier === 'discount',
            accurateUnitPrice: pricingInfo?.unitPrice || item.basePrice,
            accurateTotalPrice: pricingInfo?.totalPrice || (item.basePrice * item.quantity)
          }
        };
      });

      console.log('📝 Detailed order items with accurate MOQ pricing per inventory ID:', orderItemDetailsToInsert);

      const { error: orderItemDetailsError } = await supabase
        .from('customer_order_item_details')
        .insert(orderItemDetailsToInsert);

      if (orderItemDetailsError) {
        console.error('❌ Order item details error:', orderItemDetailsError);
        throw orderItemDetailsError;
      }

      console.log('✅ Order completed successfully with accurate MOQ pricing matching cart exactly!');
      
      // Clear cart and show success
      clearCart();
      setOrderId(orderData.id);
      setShowSuccess(true);
      toast.success('Order placed successfully! Accurate MOQ pricing applied and saved to database.');

    } catch (error) {
      console.error('💥 Order submission failed:', error);
      toast.error(`Failed to place order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use accurate pricing calculations that match the cart
  const totalSavings = getTotalSavings() + promoDiscount;
  const subtotal = getTotalPrice(); // This now matches cart calculation exactly
  const totalBeforeDelivery = subtotal - promoDiscount;
  const finalTotal = totalBeforeDelivery + (deliveryLocation ? deliveryLocation.delivery_price : 0);

  if (showSuccess && orderId) {
    return <CheckoutSuccess orderId={orderId} />;
  }

  return (
    <div className="container mx-auto py-8 pb-32">
      <h1 className="text-2xl font-bold mb-4">Universal Checkout - Accurate Pricing</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
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

          <Card>
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
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            appliedPromo={appliedPromo}
            isPromoApplied={isPromoApplied}
            onApplyPromo={() => handlePromoCodeApplied(appliedPromo!)}
            onRemovePromo={handlePromoCodeRemoved}
          />
        </div>

        <div className="space-y-6">
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
        </div>
      </div>

      {/* Fixed Bottom Checkout Button for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-50">
        <div className="container mx-auto">
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting || cartItems.length === 0}
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition-colors duration-200"
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Order...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Place Order - Rs. {finalTotal.toFixed(2)}
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Checkout pricing now matches cart pricing exactly with accurate MOQ calculations.
        </p>
      </div>
    </div>
  );
}
