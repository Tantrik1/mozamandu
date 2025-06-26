
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

interface ProfileAutoFillProps {
  onAutoFill: (data: {
    customerName: string;
    customerEmail: string;
    contactNumber: string;
    whatsappNumber: string;
  }) => void;
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function ProfileAutoFill({ onAutoFill, isChecked, onCheckedChange }: ProfileAutoFillProps) {
  const { user, userProfile } = useAuth();

  const handleAutoFill = (checked: boolean) => {
    onCheckedChange(checked);
    
    if (checked && user && userProfile) {
      onAutoFill({
        customerName: userProfile.full_name || '',
        customerEmail: user.email || '',
        contactNumber: userProfile.contact_number || '',
        whatsappNumber: userProfile.whatsapp_number || '',
      });
    }
  };

  // Don't show if user is not logged in or doesn't have profile data
  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <Checkbox
        id="auto-fill-profile"
        checked={isChecked}
        onCheckedChange={handleAutoFill}
      />
      <Label htmlFor="auto-fill-profile" className="text-sm font-medium cursor-pointer">
        Use my profile information to auto-fill delivery details
      </Label>
    </div>
  );
}
