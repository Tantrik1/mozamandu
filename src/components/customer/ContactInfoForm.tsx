
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ContactInfoFormProps {
  onComplete: () => void;
}

export function ContactInfoForm({ onComplete }: ContactInfoFormProps) {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [contactNumber, setContactNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sameAsContact, setSameAsContact] = useState(true);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.contact_number) {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);

  useEffect(() => {
    if (sameAsContact) {
      setWhatsappNumber(contactNumber);
    }
  }, [contactNumber, sameAsContact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactNumber.trim()) {
      toast({
        title: "Error",
        description: "Contact number is required",
        variant: "destructive",
      });
      return;
    }

    const finalWhatsappNumber = sameAsContact ? contactNumber : whatsappNumber;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          contact_number: contactNumber.trim(),
          whatsapp_number: finalWhatsappNumber.trim(),
          address: address.trim(),
        })
        .eq('id', user?.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update contact information",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Contact information updated successfully",
      });

      onComplete();
    } catch (error) {
      console.error('Contact info update error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="contact">Contact Number *</Label>
              <Input
                id="contact"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Enter your contact number"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="same-whatsapp"
                checked={sameAsContact}
                onCheckedChange={(checked) => setSameAsContact(checked as boolean)}
              />
              <Label htmlFor="same-whatsapp" className="text-sm">
                WhatsApp number is same as contact number
              </Label>
            </div>

            {!sameAsContact && (
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Enter your WhatsApp number"
                />
              </div>
            )}

            <div>
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Complete Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
