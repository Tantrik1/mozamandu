
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCheckoutSession } from './CheckoutSession';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

export function EnhancedCheckoutInfo({ isGuest, onComplete, onBack }: CheckoutInfoProps) {
  const { user, userProfile } = useAuth();
  const { updateActivity, isExpired } = useCheckoutSession();
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
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

  const fetchDeliveryLocations = async (attempt = 1) => {
    console.log(`Fetching delivery locations (attempt ${attempt})...`);
    setIsLoadingLocations(true);
    
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('id, place_name, delivery_price')
        .eq('is_active', true)
        .order('place_name');

      if (error) {
        throw error;
      }

      console.log('Delivery locations fetched:', data);
      setDeliveryLocations(data || []);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
      
      if (attempt < 3) {
        // Retry with exponential backoff
        setTimeout(() => {
          fetchDeliveryLocations(attempt + 1);
        }, 1000 * attempt);
        setRetryCount(attempt);
      } else {
        toast({
          title: "Error Loading Delivery Options",
          description: "Failed to load delivery locations. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateActivity();
    
    if (isExpired) {
      toast({
        title: "Session Expired",
        description: "Please restart the checkout process",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.customerName || !formData.customerEmail || !formData.contactNumber || 
        !formData.deliveryLocationId || !formData.deliveryAddress) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customerEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Store checkout info in sessionStorage for next step
    sessionStorage.setItem('checkoutInfo', JSON.stringify(formData));
    onComplete();
  };

  const selectedLocation = deliveryLocations.find(loc => loc.id === formData.deliveryLocationId);

  if (isExpired) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your checkout session has expired. Please start over.
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.href = '/'} className="mt-4">
          Return to Home
        </Button>
      </div>
    );
  }

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
          {isLoadingLocations && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading delivery locations...
                {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
              </AlertDescription>
            </Alert>
          )}

          {!isLoadingLocations && deliveryLocations.length === 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No delivery locations available. Please contact support.
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchDeliveryLocations()}
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.customerName}
                  onChange={(e) => {
                    setFormData({ ...formData, customerName: e.target.value });
                    updateActivity();
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, customerEmail: e.target.value });
                    updateActivity();
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact">Contact Number *</Label>
                <Input
                  id="contact"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, contactNumber: e.target.value });
                    updateActivity();
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, whatsappNumber: e.target.value });
                    updateActivity();
                  }}
                  placeholder="Same as contact if not provided"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Delivery Location *</Label>
              <Select
                value={formData.deliveryLocationId}
                onValueChange={(value) => {
                  setFormData({ ...formData, deliveryLocationId: value });
                  updateActivity();
                }}
                disabled={isLoadingLocations || deliveryLocations.length === 0}
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
                onChange={(e) => {
                  setFormData({ ...formData, deliveryAddress: e.target.value });
                  updateActivity();
                }}
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || isLoadingLocations || deliveryLocations.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
