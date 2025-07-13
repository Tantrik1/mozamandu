
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
}

interface DeliveryLocationSelectorProps {
  selectedLocationId: string;
  onLocationChange: (locationId: string, charge: number) => void;
}

export function DeliveryLocationSelector({ 
  selectedLocationId, 
  onLocationChange
}: DeliveryLocationSelectorProps) {
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveryCharges();
  }, []);

  const fetchDeliveryCharges = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('*')
        .eq('is_active', true)
        .order('place_name');

      if (error) throw error;
      setDeliveryCharges(data || []);
    } catch (error) {
      console.error('Error fetching delivery charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    const selectedLocation = deliveryCharges.find(loc => loc.id === locationId);
    if (selectedLocation) {
      onLocationChange(locationId, selectedLocation.delivery_price);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Location</CardTitle>
        <CardDescription>Select your delivery area to calculate shipping costs</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedLocationId} onValueChange={handleLocationChange} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading..." : "Select delivery location"} />
          </SelectTrigger>
          <SelectContent>
            {deliveryCharges.map((delivery) => (
              <SelectItem key={delivery.id} value={delivery.id}>
                {delivery.place_name} - Rs. {delivery.delivery_price}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
