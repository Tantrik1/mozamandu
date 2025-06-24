
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, User, Mail, Phone, MessageSquare } from 'lucide-react';
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

interface FormData {
  customerName: string;
  customerEmail: string;
  contactNumber: string;
  whatsappNumber: string;
  deliveryLocationId: string;
  deliveryAddress: string;
}

export function EnhancedCheckoutInfo({ isGuest, onComplete, onBack }: CheckoutInfoProps) {
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerEmail: '',
    contactNumber: '',
    whatsappNumber: '',
    deliveryLocationId: '',
    deliveryAddress: '',
  });

  // Load saved form data on component mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('checkoutInfo');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed);
      } catch (error) {
        console.error('Error parsing saved checkout info:', error);
      }
    }
    fetchDeliveryLocations();
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
    if (formData.customerName || formData.customerEmail || formData.contactNumber) {
      sessionStorage.setItem('checkoutInfo', JSON.stringify(formData));
    }
  }, [formData]);

  const fetchDeliveryLocations = async () => {
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
      } else {
        setDeliveryLocations(data || []);
      }
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim() || !formData.customerEmail.trim() || 
        !formData.contactNumber.trim() || !formData.deliveryLocationId || 
        !formData.deliveryAddress.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customerEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Phone validation
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
    if (!phoneRegex.test(formData.contactNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    onComplete();
  };

  const selectedLocation = deliveryLocations.find(loc => loc.id === formData.deliveryLocationId);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading delivery options...</p>
        </div>
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
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            {isGuest ? 'Guest Checkout Information' : 'Delivery Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <User className="w-4 h-4 mr-2" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      placeholder="Enter your email"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact">Contact Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="contact"
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                      placeholder="Enter your phone number"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp Number (Optional)</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="whatsapp"
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                      placeholder="WhatsApp number (if different)"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Delivery Information
              </h3>

              <div>
                <Label htmlFor="location">Delivery Location *</Label>
                <Select
                  value={formData.deliveryLocationId}
                  onValueChange={(value) => handleInputChange('deliveryLocationId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery location" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{location.place_name}</span>
                          <span className="ml-4 text-sm text-gray-600">
                            +${location.delivery_price.toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLocation && (
                  <p className="text-sm text-gray-600 mt-1">
                    Delivery charge: ${selectedLocation.delivery_price.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Complete Address *</Label>
                <Textarea
                  id="address"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Enter your complete delivery address..."
                  rows={3}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              Continue to Payment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
