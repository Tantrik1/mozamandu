
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { signIn, user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  
  const [authLoading, setAuthLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const [otpData, setOtpData] = useState({
    code: '',
    email: '',
  });

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (user && userProfile && !isLoading) {
      console.log('User authenticated, redirecting based on role:', userProfile.role);
      
      // Handle redirect parameter first
      if (redirectTo) {
        navigate(redirectTo);
        return;
      }

      // Role-based redirect
      if (userProfile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, userProfile, isLoading, navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.email || !signInData.password) {
      return;
    }
    
    setAuthLoading(true);
    
    try {
      const { error } = await signIn(signInData.email, signInData.password);
      if (!error) {
        // Success handling is done in useEffect above
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const sendOTP = async (email: string, isResend: boolean = false) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      // Store OTP in database
      const { error } = await supabase
        .from('email_verification_codes')
        .insert({
          email,
          code,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        throw new Error('Failed to generate verification code');
      }

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email,
          code,
          name: signUpData.fullName,
        },
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        // Fallback: show code in toast for demo
        toast({
          title: isResend ? "New Verification Code" : "Verification Code Sent",
          description: `Your verification code is: ${code} (Note: Email service not configured, showing code here)`,
          duration: 10000,
        });
      } else {
        toast({
          title: isResend ? "New Code Sent" : "Verification Code Sent",
          description: `Please check your email for the verification code.`,
        });
      }

      if (isResend) {
        setResendCooldown(60); // 60 second cooldown
      }

      return true;
    } catch (error) {
      console.error('OTP sending error:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpData.email || !signUpData.password || !signUpData.fullName) {
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      return;
    }

    if (signUpData.password.length < 6) {
      return;
    }
    
    setAuthLoading(true);
    
    try {
      const success = await sendOTP(signUpData.email);
      if (success) {
        setSignUpEmail(signUpData.email);
        setOtpData({ ...otpData, email: signUpData.email });
        setShowOTP(true);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setAuthLoading(true);
    await sendOTP(otpData.email, true);
    setAuthLoading(false);
  };

  const verifyOTP = async () => {
    setAuthLoading(true);

    try {
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
        setAuthLoading(false);
        return;
      }

      // Mark code as verified
      await supabase
        .from('email_verification_codes')
        .update({ verified: true })
        .eq('id', verification.id);

      // Create the user account with customer role
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
          title: "Account Created Successfully!",
          description: "Welcome to Mozamandu. You can now sign in.",
        });
        // Reset form and go back to sign in
        setSignUpData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
        });
        setShowOTP(false);
        setOtpData({ code: '', email: '' });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showOTP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
              disabled={otpData.code.length !== 6 || authLoading}
              className="w-full"
            >
              {authLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">Didn't receive the code?</p>
              <Button 
                variant="ghost" 
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || authLoading}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s` 
                  : authLoading 
                    ? 'Sending...' 
                    : 'Resend Code'
                }
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => setShowOTP(false)}
              className="w-full"
            >
              Back to Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Mozamandu</h2>
          <p className="mt-2 text-gray-600">Your premium gear destination</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Sign In to Your Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email Address</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={authLoading || !signInData.email || !signInData.password}
                  >
                    {authLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create New Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      placeholder="Enter your email"
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
                      placeholder="Minimum 6 characters"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                  {signUpData.password && signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                  {signUpData.password && signUpData.password.length < 6 && (
                    <p className="text-sm text-red-600">Password must be at least 6 characters</p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={
                      authLoading || 
                      !signUpData.email || 
                      !signUpData.password || 
                      !signUpData.fullName ||
                      signUpData.password !== signUpData.confirmPassword ||
                      signUpData.password.length < 6
                    }
                  >
                    {authLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
