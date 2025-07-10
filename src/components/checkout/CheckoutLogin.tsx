
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignUpForm } from '@/components/auth/SignUpForm';

interface CheckoutLoginProps {
  onSuccess: () => void;
}

export function CheckoutLogin({ onSuccess }: CheckoutLoginProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Login to Continue</CardTitle>
        </CardHeader>
        <CardContent>
          <SignUpForm onSuccess={onSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
