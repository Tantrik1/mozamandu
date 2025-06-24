
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';

interface CheckoutLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function CheckoutLogin({ onSuccess, onBack }: CheckoutLoginProps) {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpData, setSignUpData] = useState<any>(null);
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginData.email, loginData.password);
    
    if (!error) {
      onSuccess();
    }
    
    setIsLoading(false);
  };

  const handleOTPSent = (email: string, formData: any) => {
    setSignUpEmail(email);
    setSignUpData(formData);
    setShowOTP(true);
  };

  const handleVerificationSuccess = () => {
    setShowOTP(false);
    onSuccess();
  };

  if (showOTP) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <OTPVerificationForm
            email={signUpEmail}
            signUpData={signUpData}
            onBack={() => setShowOTP(false)}
            onSuccess={handleVerificationSuccess}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Login or Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <SignUpForm 
                onOTPSent={handleOTPSent}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
