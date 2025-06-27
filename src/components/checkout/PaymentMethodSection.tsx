import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

interface FormErrors {
  [key: string]: string;
}

interface PaymentMethodSectionProps {
  paymentMethods: PaymentMethod[];
  selectedPayment: string;
  setSelectedPayment: (value: string) => void;
  paymentType: 'full' | 'partial';
  onPaymentTypeChange: (type: 'full' | 'partial') => void;
  paidAmount: string;
  setPaidAmount: (value: string) => void;
  paymentScreenshot: File | null;
  setPaymentScreenshot: (file: File | null) => void;
  finalTotal: number;
  minimumPayment: number;
  formErrors: FormErrors;
  uploadingScreenshot: boolean;
}

export function PaymentMethodSection({
  paymentMethods,
  selectedPayment,
  setSelectedPayment,
  paymentType,
  onPaymentTypeChange,
  paidAmount,
  setPaidAmount,
  paymentScreenshot,
  setPaymentScreenshot,
  finalTotal,
  minimumPayment,
  formErrors,
  uploadingScreenshot
}: PaymentMethodSectionProps) {
  const selectedPaymentMethod = paymentMethods.find(p => p.id === selectedPayment);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>Choose your preferred payment method and upload payment proof</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedPayment} onValueChange={setSelectedPayment}>
          <SelectTrigger className={formErrors.payment ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.payment && <p className="text-sm text-red-500 mt-1">{formErrors.payment}</p>}

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
          <Label>Payment Amount *</Label>
          <RadioGroup
            value={paymentType}
            onValueChange={onPaymentTypeChange}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full">Pay Full Amount (Rs. {finalTotal.toFixed(2)})</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="partial" />
              <Label htmlFor="partial">Pay Partial Amount (Min: Rs. {minimumPayment.toFixed(2)} - 20%)</Label>
            </div>
          </RadioGroup>

          {paymentType === 'partial' && (
            <div className="mt-3">
              <Input
                type="number"
                step="0.01"
                min={minimumPayment}
                max={finalTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={`Enter amount (Min: Rs. ${minimumPayment.toFixed(2)})`}
                className={formErrors.paidAmount ? 'border-red-500' : ''}
              />
              {formErrors.paidAmount && <p className="text-sm text-red-500 mt-1">{formErrors.paidAmount}</p>}
              <p className="text-sm text-gray-600 mt-1">
                Range: Rs. {minimumPayment.toFixed(2)} - Rs. {finalTotal.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <div>
          <Label>Payment Screenshot *</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
            disabled={uploadingScreenshot}
            required
          />
          <p className="text-xs text-red-500 mt-1">
            Payment screenshot is required to complete your order
          </p>
          {uploadingScreenshot && (
            <div className="flex items-center mt-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Uploading screenshot...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
