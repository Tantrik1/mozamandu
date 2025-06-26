
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
}

interface FormErrors {
  [key: string]: string;
}

interface DeliveryLocationSelectorProps {
  deliveryCharges: DeliveryCharge[];
  selectedDelivery: string;
  setSelectedDelivery: (value: string) => void;
  formErrors: FormErrors;
}

export function DeliveryLocationSelector({ 
  deliveryCharges, 
  selectedDelivery, 
  setSelectedDelivery, 
  formErrors 
}: DeliveryLocationSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Location</CardTitle>
        <CardDescription>Select your delivery area to calculate shipping costs</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
          <SelectTrigger className={formErrors.delivery ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select delivery location" />
          </SelectTrigger>
          <SelectContent>
            {deliveryCharges.map((delivery) => (
              <SelectItem key={delivery.id} value={delivery.id}>
                {delivery.place_name} - Rs. {delivery.delivery_price}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formErrors.delivery && <p className="text-sm text-red-500 mt-1">{formErrors.delivery}</p>}
      </CardContent>
    </Card>
  );
}
