
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DeliveryInformationProps {
  user: any;
  isGuest: boolean;
  onNext: (data: any) => void;
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

export function DeliveryInformation({ user, isGuest, onNext }: DeliveryInformationProps) {
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [sameAsContact, setSameAsContact] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      customerName: user?.user_metadata?.full_name || '',
      customerEmail: user?.email || '',
      contactNumber: '',
      whatsappNumber: '',
      deliveryLocationId: '',
      deliveryAddress: ''
    }
  });

  const contactNumber = watch('contactNumber');

  useEffect(() => {
    fetchDeliveryLocations();
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (sameAsContact) {
      setValue('whatsappNumber', contactNumber);
    }
  }, [sameAsContact, contactNumber, setValue]);

  const fetchDeliveryLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('*')
        .eq('is_active', true)
        .order('place_name');

      if (error) throw error;
      setDeliveryLocations(data || []);
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load delivery locations',
        variant: 'destructive'
      });
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setValue('customerName', data.full_name || '');
        setValue('contactNumber', data.contact_number || '');
        setValue('whatsappNumber', data.whatsapp_number || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Validate delivery location exists
      const selectedLocation = deliveryLocations.find(loc => loc.id === data.deliveryLocationId);
      if (!selectedLocation) {
        throw new Error('Please select a valid delivery location');
      }

      const deliveryData = {
        ...data,
        deliveryCharge: selectedLocation.delivery_price,
        deliveryLocationName: selectedLocation.place_name
      };

      onNext(deliveryData);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Please check your information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                {...register('customerName', { required: 'Name is required' })}
                placeholder="Enter your full name"
              />
              {errors.customerName && (
                <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="customerEmail">Email Address *</Label>
              <Input
                id="customerEmail"
                type="email"
                {...register('customerEmail', { 
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Please enter a valid email'
                  }
                })}
                placeholder="Enter your email"
                readOnly={!isGuest && !!user}
              />
              {errors.customerEmail && (
                <p className="text-red-500 text-sm mt-1">{errors.customerEmail.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactNumber">Contact Number *</Label>
              <Input
                id="contactNumber"
                {...register('contactNumber', { required: 'Contact number is required' })}
                placeholder="Enter your contact number"
              />
              {errors.contactNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.contactNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                {...register('whatsappNumber')}
                placeholder="Enter WhatsApp number"
                disabled={sameAsContact}
              />
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="sameAsContact"
                  checked={sameAsContact}
                  onCheckedChange={(checked) => setSameAsContact(checked as boolean)}
                />
                <Label htmlFor="sameAsContact" className="text-sm">
                  Same as contact number
                </Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="deliveryLocation">Delivery Location *</Label>
            <Select
              onValueChange={(value) => setValue('deliveryLocationId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery location" />
              </SelectTrigger>
              <SelectContent>
                {deliveryLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.place_name} - Rs. {location.delivery_price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deliveryLocationId && (
              <p className="text-red-500 text-sm mt-1">Please select a delivery location</p>
            )}
          </div>

          <div>
            <Label htmlFor="deliveryAddress">Delivery Address *</Label>
            <Textarea
              id="deliveryAddress"
              {...register('deliveryAddress', { required: 'Delivery address is required' })}
              placeholder="Enter your complete delivery address"
              rows={3}
            />
            {errors.deliveryAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.deliveryAddress.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
