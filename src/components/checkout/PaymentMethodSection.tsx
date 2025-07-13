
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
  selectedMethodId: string;
  onMethodChange: (methodId: string) => void;
  paymentPercentage: number;
  onPercentageChange: (percentage: number) => void;
}

export function PaymentMethodSection({
  selectedMethodId,
  onMethodChange,
  paymentPercentage,
  onPercentageChange
}: PaymentMethodSectionProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedPaymentMethod = paymentMethods.find(p => p.id === selectedMethodId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>Choose your preferred payment method</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedMethodId} onValueChange={onMethodChange} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading..." : "Select payment method"} />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            value={paymentPercentage === 100 ? 'full' : 'partial'}
            onValueChange={(value) => onPercentageChange(value === 'full' ? 100 : 20)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full">Pay Full Amount</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="partial" />
              <Label htmlFor="partial">Pay Partial Amount (Minimum 20%)</Label>
            </div>
          </RadioGroup>

          {paymentPercentage < 100 && (
            <div className="mt-3">
              <Input
                type="number"
                min={20}
                max={100}
                value={paymentPercentage}
                onChange={(e) => onPercentageChange(Number(e.target.value))}
                placeholder="Enter percentage (20-100)"
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter percentage between 20% and 100%
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
