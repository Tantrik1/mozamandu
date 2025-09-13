
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface CustomerInfoFormProps {
  customerInfo: CustomerInfo;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  deliveryLocations: DeliveryLocation[];
  deliveryLocation: DeliveryLocation | null;
  setDeliveryLocation: React.Dispatch<React.SetStateAction<DeliveryLocation | null>>;
}

export function CustomerInfoForm({
  customerInfo,
  setCustomerInfo,
  deliveryLocations,
  deliveryLocation,
  setDeliveryLocation,
}: CustomerInfoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Contact Number *</Label>
          <Input
            id="phone"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="whatsapp">WhatsApp Number (Optional)</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="whatsappSameAsContact"
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCustomerInfo(prev => ({
                    ...prev,
                    whatsapp: checked ? prev.phone : prev.whatsapp || ''
                  }));
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="whatsappSameAsContact" className="text-sm font-medium cursor-pointer text-gray-700">
                Same as contact number
              </Label>
            </div>
            <Input
              id="whatsapp"
              value={customerInfo.whatsapp || ''}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Delivery Address *</Label>
          <Input
            id="address"
            value={customerInfo.address}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label>Delivery Location *</Label>
          <Select 
            value={deliveryLocation?.id || ''} 
            onValueChange={(value) => {
              const location = deliveryLocations.find(loc => loc.id === value);
              setDeliveryLocation(location || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select delivery location" />
            </SelectTrigger>
            <SelectContent>
              {deliveryLocations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.place_name} - Rs. {location.delivery_price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
