
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CheckoutLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function CheckoutLogin({ onSuccess, onBack }: CheckoutLoginProps) {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const [otpData, setOtpData] = useState({
    code: '',
    email: '',
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

  const sendOTP = async (email: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { error } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
      return false;
    }

    // In a real app, you'd send this via email service
    // For demo purposes, we'll show it in a toast
    toast({
      title: "Verification Code Sent",
      description: `Your verification code is: ${code}`,
      duration: 10000,
    });

    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await sendOTP(signUpData.email);
      if (success) {
        setSignUpEmail(signUpData.email);
        setOtpData({ ...otpData, email: signUpData.email });
        setShowOTP(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const verifyOTP = async () => {
    setIsLoading(true);

    const { data: verification, error: verifyError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', otpData.email)
      .eq('code', otpData.code)
      .gt('expires_at', new Date().toISOString())
      .eq('verified', false)
      .single();

    if (verifyError || !verification) {
      toast({
        title: "Invalid Code",
        description: "The verification code is invalid or expired",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Mark code as verified
    await supabase
      .from('email_verification_codes')
      .update({ verified: true })
      .eq('id', verification.id);

    // Create the user account
    const { error: signUpError } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: signUpData.fullName,
          role: 'customer',
        },
      },
    });

    if (signUpError) {
      toast({
        title: "Error",
        description: signUpError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  if (showOTP) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <Mail className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <CardTitle>Verify Your Email</CardTitle>
          <p className="text-sm text-gray-600">
            Enter the verification code sent to {signUpEmail}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              value={otpData.code}
              onChange={(value) => setOtpData({ ...otpData, code: value })}
              maxLength={6}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          
          <Button 
            onClick={verifyOTP} 
            disabled={otpData.code.length !== 6 || isLoading}
            className="w-full"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => setShowOTP(false)}
            className="w-full"
          >
            Back to Sign Up
          </Button>
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
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
