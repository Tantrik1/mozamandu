
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Phone, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ContactInfoFormProps {
  userId: string;
  onComplete: () => void;
}

export function ContactInfoForm({ userId, onComplete }: ContactInfoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { redirectBasedOnRole } = useAuth();
  const [contactData, setContactData] = useState({
    contactNumber: '',
    whatsappNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactData.contactNumber) {
      toast({
        title: "Contact Number Required",
        description: "Please provide your contact number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          contact_number: contactData.contactNumber,
          whatsapp_number: contactData.whatsappNumber || null,
        })
        .eq('id', userId);

      if (error) {
        console.error('Update error:', error);
        toast({
          title: "Error",
          description: "Failed to save contact information",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Contact information saved successfully!",
        });
        onComplete();
        // Force redirect after profile update
        setTimeout(() => {
          redirectBasedOnRole();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Phone className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <CardTitle>Complete Your Profile</CardTitle>
          <p className="text-sm text-gray-600">
            Please provide your contact information to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="contact-number">Contact Number *</Label>
              <Input
                id="contact-number"
                type="tel"
                value={contactData.contactNumber}
                onChange={(e) => setContactData({ ...contactData, contactNumber: e.target.value })}
                placeholder="Enter your contact number"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="whatsapp-number">
                WhatsApp Number (Optional)
                <MessageCircle className="w-4 h-4 inline ml-1" />
              </Label>
              <Input
                id="whatsapp-number"
                type="tel"
                value={contactData.whatsappNumber}
                onChange={(e) => setContactData({ ...contactData, whatsappNumber: e.target.value })}
                placeholder="Enter your WhatsApp number"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !contactData.contactNumber}
            >
              {isLoading ? 'Saving...' : 'Continue to Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
