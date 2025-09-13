
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

interface PaymentMethodSectionProps {
  selectedMethodId?: string;
  onMethodChange?: (methodId: string) => void;
  paymentPercentage?: number;
  onPercentageChange?: (percentage: number) => void;
  // Additional props for UniversalCheckout compatibility
  paymentMethods?: PaymentMethod[];
  selectedPayment?: string;
  setSelectedPayment?: (value: string) => void;
  paymentType?: string;
  onPaymentTypeChange?: (type: string) => void;
  paidAmount?: string;
  setPaidAmount?: (amount: string) => void;
  paymentScreenshot?: any;
  setPaymentScreenshot?: (screenshot: any) => void;
  finalTotal?: number;
  minimumPayment?: number;
  formErrors?: any;
  uploadingScreenshot?: boolean;
}

export function PaymentMethodSection({
  selectedMethodId,
  onMethodChange,
  paymentPercentage = 100,
  onPercentageChange,
  paymentMethods: externalPaymentMethods,
  selectedPayment,
  setSelectedPayment,
  paymentType,
  onPaymentTypeChange,
  paidAmount,
  setPaidAmount,
  finalTotal,
  minimumPayment
}: PaymentMethodSectionProps) {
  const [internalPaymentMethods, setInternalPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Use external payment methods if provided, otherwise fetch them
  const paymentMethods = externalPaymentMethods || internalPaymentMethods;
  const currentSelectedId = selectedMethodId || selectedPayment || '';
  const handleMethodChange = onMethodChange || setSelectedPayment || (() => {});

  useEffect(() => {
    if (!externalPaymentMethods) {
      fetchPaymentMethods();
    } else {
      setLoading(false);
      // Auto-select first payment method if none selected
      if (externalPaymentMethods.length > 0 && !currentSelectedId) {
        handleMethodChange(externalPaymentMethods[0].id);
      }
    }
  }, [externalPaymentMethods]);

  useEffect(() => {
    // Auto-select first payment method when internal methods are loaded
    if (internalPaymentMethods.length > 0 && !currentSelectedId) {
      handleMethodChange(internalPaymentMethods[0].id);
    }
  }, [internalPaymentMethods, currentSelectedId]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setInternalPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedPaymentMethod = paymentMethods.find(p => p.id === currentSelectedId);

  const handlePaymentTypeChange = (type: string) => {
    console.log('Payment type changed to:', type);
    if (onPaymentTypeChange) {
      onPaymentTypeChange(type);
    } else if (onPercentageChange) {
      onPercentageChange(type === 'full' ? 100 : 20);
    }
  };

  const handlePaidAmountChange = (value: string) => {
    console.log('Paid amount changed to:', value);
    if (setPaidAmount) {
      setPaidAmount(value);
    } else if (onPercentageChange && finalTotal) {
      const amount = parseFloat(value) || 0;
      const percentage = (amount / finalTotal) * 100;
      onPercentageChange(Math.min(100, Math.max(20, percentage)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>Choose your preferred payment method</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={currentSelectedId} 
          onValueChange={handleMethodChange} 
          disabled={loading}
          defaultValue={paymentMethods.length > 0 ? paymentMethods[0].id : ''}
        >
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center space-x-2">
              <RadioGroupItem value={method.id} id={method.id} />
              <Label htmlFor={method.id} className="cursor-pointer">
                {method.name}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {selectedPaymentMethod && (
          <div className="text-center">
            <img 
              src={selectedPaymentMethod.qr_code_url} 
              alt={`${selectedPaymentMethod.name} QR Code`}
              className="mx-auto max-w-48 h-48 object-contain border rounded"
            />
            <p className="text-sm text-gray-600 mt-2">
              Scan this QR code to make payment
            </p>
          </div>
        )}

        <div>
          <Label>Payment Amount</Label>
          <RadioGroup
            value={paymentType || (paymentPercentage === 100 ? 'full' : 'partial')}
            onValueChange={handlePaymentTypeChange}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full">Pay Full Amount</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="partial" />
              <Label htmlFor="partial">Pay Partial Amount (Minimum Rs. {minimumPayment?.toFixed(2) || '0.00'})</Label>
            </div>
          </RadioGroup>

          {((paymentType === 'partial') || (!paymentType && paymentPercentage < 100)) && (
            <div className="mt-3">
              <Label htmlFor="payment-amount" className="text-sm font-medium">Enter Amount (Rs.)</Label>
              <Input
                id="payment-amount"
                type="text"
                value={paidAmount}
                onChange={(e) => handlePaidAmountChange(e.target.value)}
                placeholder={`Enter amount (Min: Rs. ${minimumPayment?.toFixed(2) || '0.00'})`}
                className="mt-1"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Minimum: Rs. {minimumPayment?.toFixed(2) || '0.00'}</span>
                <span>Maximum: Rs. {finalTotal?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
