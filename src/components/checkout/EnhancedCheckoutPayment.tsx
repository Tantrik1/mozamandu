
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PaymentScreenshotUpload } from './PaymentScreenshotUpload';

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
  is_active: boolean;
}

interface EnhancedCheckoutPaymentProps {
  paymentPercentage: number;
  onPaymentMethodChange: (methodId: string) => void;
  onPaymentScreenshotChange: (url: string) => void;
  selectedPaymentMethod: string;
  paymentScreenshotUrl: string;
}

export function EnhancedCheckoutPayment({
  paymentPercentage,
  onPaymentMethodChange,
  onPaymentScreenshotChange,
  selectedPaymentMethod,
  paymentScreenshotUrl
}: EnhancedCheckoutPaymentProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

      if (error) {
        console.error('Error fetching payment methods:', error);
        toast({
          title: "Error",
          description: "Failed to load payment methods",
          variant: "destructive",
        });
      } else {
        setPaymentMethods(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMethod = paymentMethods.find(method => method.id === selectedPaymentMethod);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      // For now, we'll use a placeholder URL
      // In a real implementation, you'd upload the file to storage
      onPaymentScreenshotChange(`uploaded-${file.name}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment Method</span>
            <Badge variant="outline" className="text-blue-600">
              {paymentPercentage}% Payment Required
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No payment methods available</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPaymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onPaymentMethodChange(method.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedPaymentMethod === method.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedPaymentMethod === method.id && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <span className="font-medium">{method.name}</span>
                    </div>
                    <div className="w-16 h-16 border rounded-lg overflow-hidden">
                      <img
                        src={method.qr_code_url}
                        alt={`${method.name} QR Code`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMethod && (
        <Card>
          <CardHeader>
            <CardTitle>QR Code - {selectedMethod.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <div className="w-64 h-64 border rounded-lg overflow-hidden bg-white">
                <img
                  src={selectedMethod.qr_code_url}
                  alt={`${selectedMethod.name} QR Code`}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="text-center text-sm text-gray-600">
              <p>Scan this QR code with your {selectedMethod.name} app to make the payment</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Payment Screenshot</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentScreenshotUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Important:</strong> Please upload a clear screenshot of your payment confirmation 
              from your mobile banking app. This helps us verify your payment quickly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
