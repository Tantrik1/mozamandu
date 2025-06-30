import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useRobustCart } from '@/hooks/useRobustCart';
import { usePromoCode } from '@/hooks/usePromoCode';
import { OrderSummaryCard } from './OrderSummaryCard';
import { PaymentOptionsCard } from './PaymentOptionsCard';
import { incrementPromoCodeUsage } from '@/utils/promoCodeUtils';

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
}

interface PricingInfo {
  finalPrice: number;
  description: string;
  mode: 'normal' | 'discount' | 'combo';
  isCombo?: boolean;
  breakdown?: string[];
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  minimum_order_amount: number;
}

export function UniversalCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItems, getTotalPrice, clearCart, getItemPricing } = useRobustCart();
  const { promoCode, setPromoCode, appliedPromo, isPromoApplied, applyPromoCode, removePromoCode } = usePromoCode();

  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const subtotal = getTotalPrice();
  const deliveryPrice = 150;
  const totalWithDelivery = subtotal + deliveryPrice;
  const promoDiscount = appliedPromo ? (totalWithDelivery * appliedPromo.discount_percentage) / 100 : 0;
  const finalTotal = totalWithDelivery - promoDiscount;
  const minimumPayment = finalTotal * 0.2;

  useEffect(() => {
    const initialPromoCode = searchParams.get('promo');
    if (initialPromoCode) {
      setPromoCode(initialPromoCode);
    }
  }, [searchParams, setPromoCode]);

  useEffect(() => {
    if (promoCode && !isPromoApplied) {
      applyPromoCode(totalWithDelivery);
    }
  }, [promoCode, isPromoApplied, applyPromoCode, totalWithDelivery]);

  const handleApplyPromo = () => {
    applyPromoCode(totalWithDelivery);
  };

  const handleRemovePromo = () => {
    removePromoCode();
  };

  const handlePaymentTypeChange = (type: 'full' | 'partial') => {
    setPaymentType(type);
    setPaidAmount(type === 'full' ? finalTotal.toString() : minimumPayment.toFixed(2));
  };

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value || /^\d*\.?\d*$/.test(value)) {
      setPaidAmount(value);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPaymentScreenshot(file || null);
  };

  const handleSubmitOrder = async () => {
    if (submitting) return;

    setSubmitting(true);
    setUploadingScreenshot(false);

    try {
      if (cartItems.length === 0) {
        toast({
          title: "Cart Empty",
          description: "Your cart is empty. Add items to place an order.",
          variant: "destructive",
        });
        return;
      }

      if (paymentType === 'partial') {
        const paid = parseFloat(paidAmount || '0');
        if (paid < minimumPayment) {
          toast({
            title: "Insufficient Payment",
            description: `Minimum payment required is Rs. ${minimumPayment.toFixed(2)}`,
            variant: "destructive",
          });
          return;
        }
        if (!paymentScreenshot) {
          toast({
            title: "Missing Screenshot",
            description: "Please upload a payment screenshot.",
            variant: "destructive",
          });
          return;
        }
      }

      let paymentScreenshotUrl = null;
      if (paymentScreenshot) {
        setUploadingScreenshot(true);
        const formData = new FormData();
        formData.append('file', paymentScreenshot);
        formData.append('orderId', 'temp-order-id');

        const response = await fetch('/api/upload-screenshot', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          paymentScreenshotUrl = result.url;
        }
        setUploadingScreenshot(false);
      }

      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          color_variant_id: item.colorVariantId,
          size_variant_id: item.sizeVariantId,
        })),
        subtotal: subtotal,
        delivery_charge: deliveryPrice,
        promo_code_id: appliedPromo?.id,
        promo_discount: promoDiscount,
        total: finalTotal,
        payment_type: paymentType,
        paid_amount: parseFloat(paidAmount || '0'),
        payment_screenshot_url: paymentScreenshotUrl,
        status: 'pending',
      };

      // Simulate order creation
      await new Promise(resolve => setTimeout(resolve, 1500));

      clearCart();
      toast({
        title: "Order Placed!",
        description: "Your order has been placed successfully.",
      });
      navigate('/order-confirmation');

      // Increment promo code usage if promo code was applied
      if (appliedPromo) {
        try {
          await incrementPromoCodeUsage(appliedPromo.code);
          console.log('Promo code usage incremented successfully');
        } catch (error) {
          console.error('Failed to increment promo code usage:', error);
          // Don't fail the entire order if promo code increment fails
        }
      }

    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setUploadingScreenshot(false);
    }
  };

  return (
    <div className="container mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Options Card */}
        <PaymentOptionsCard
          paymentType={paymentType}
          paidAmount={paidAmount}
          minimumPayment={minimumPayment}
          finalTotal={finalTotal}
          paymentScreenshot={paymentScreenshot}
          onPaymentTypeChange={handlePaymentTypeChange}
          onPaidAmountChange={handlePaidAmountChange}
          onScreenshotChange={handleScreenshotChange}
          onApplyPromo={handleApplyPromo}
          onRemovePromo={handleRemovePromo}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          appliedPromo={appliedPromo}
          isPromoApplied={isPromoApplied}
        />

        {/* Order Summary Card */}
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
  );
}
