
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, User } from 'lucide-react';

interface CheckoutAuthChoiceProps {
  onChoice: (choice: 'guest' | 'login') => void;
}

export function CheckoutAuthChoice({ onChoice }: CheckoutAuthChoiceProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onChoice('guest')}>
        <CardHeader className="text-center">
          <UserPlus className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <CardTitle>Checkout as Guest</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Quick checkout without creating an account. You'll need to enter your details manually.
          </p>
          <Button className="w-full" onClick={() => onChoice('guest')}>
            Continue as Guest
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onChoice('login')}>
        <CardHeader className="text-center">
          <User className="w-12 h-12 mx-auto text-green-600 mb-4" />
          <CardTitle>Login & Checkout</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Login or create an account to save your details for faster future checkouts.
          </p>
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => onChoice('login')}>
            Login / Sign Up
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
