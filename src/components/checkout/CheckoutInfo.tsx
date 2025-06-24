
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CheckoutInfoProps {
  isGuest: boolean;
  onComplete: () => void;
  onBack: () => void;
}

interface DeliveryLocation {
  id: string;
  place_name: string;
  delivery_price: number;
}

export function CheckoutInfo({ isGuest, onComplete, onBack }: CheckoutInfoProps) {
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  
  const [formData, setFormData] = useState({
    customerName: userProfile?.full_name || '',
    customerEmail: user?.email || '',
    contactNumber: '',
    whatsappNumber: '',
    deliveryLocationId: '',
    deliveryAddress: '',
  });

  useEffect(() => {
    fetchDeliveryLocations();
  }, []);

  const fetchDeliveryLocations = async () => {
    console.log('Fetching delivery locations...');
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('id, place_name, delivery_price')
        .eq('is_active', true)
        .order('place_name');

      if (error) {
        console.error('Error fetching delivery locations:', error);
        toast({
          title: "Error",
          description: "Failed to load delivery locations",
          variant: "destructive",
        });
        return;
      }

      console.log('Delivery locations fetched:', data);
      setDeliveryLocations(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery locations",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail || !formData.contactNumber || 
        !formData.deliveryLocationId || !formData.deliveryAddress) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Store checkout info in sessionStorage for next step
    sessionStorage.setItem('checkoutInfo', JSON.stringify(formData));
    onComplete();
  };

  const selectedLocation = deliveryLocations.find(loc => loc.id === formData.deliveryLocationId);

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {isGuest ? 'Your Information' : 'Delivery Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact">Contact Number *</Label>
                <Input
                  id="contact"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="Same as contact if not provided"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Delivery Location *</Label>
              <Select
                value={formData.deliveryLocationId}
                onValueChange={(value) => setFormData({ ...formData, deliveryLocationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery location" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.place_name} (+${location.delivery_price} delivery)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address">Complete Address *</Label>
              <Textarea
                id="address"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="House/Flat number, Street, Landmark..."
                rows={3}
                required
              />
            </div>

            {selectedLocation && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Delivery Charge:</strong> ${selectedLocation.delivery_price} for {selectedLocation.place_name}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Continue to Payment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
