
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface CustomerInfo {
  name: string;
  email: string;
  contact: string;
  whatsapp: string;
  address: string;
}

interface FormErrors {
  [key: string]: string;
}

interface CustomerInfoFormProps {
  customerInfo: CustomerInfo;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  formErrors: FormErrors;
}

export function CustomerInfoForm({ customerInfo, setCustomerInfo, formErrors }: CustomerInfoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
        <CardDescription>Please provide your contact details for order delivery</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Full Name *</Label>
          <Input
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your full name"
            className={formErrors.name ? 'border-red-500' : ''}
          />
          {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
        </div>
        <div>
          <Label>Email Address *</Label>
          <Input
            type="email"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email"
            className={formErrors.email ? 'border-red-500' : ''}
          />
          {formErrors.email && <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>}
        </div>
        <div>
          <Label>Contact Number *</Label>
          <Input
            value={customerInfo.contact}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="Enter your contact number"
            className={formErrors.contact ? 'border-red-500' : ''}
          />
          {formErrors.contact && <p className="text-sm text-red-500 mt-1">{formErrors.contact}</p>}
        </div>
        <div>
          <Label>WhatsApp Number</Label>
          <Input
            value={customerInfo.whatsapp}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
            placeholder="Enter WhatsApp number (optional)"
          />
        </div>
        <div>
          <Label>Delivery Address *</Label>
          <Textarea
            value={customerInfo.address}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Enter complete delivery address"
            rows={3}
            className={formErrors.address ? 'border-red-500' : ''}
          />
          {formErrors.address && <p className="text-sm text-red-500 mt-1">{formErrors.address}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
