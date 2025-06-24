
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function Auth() {
  const { signIn, signUp, verifyOTP, user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPField, setShowOTPField] = useState(false);
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [otpCode, setOtpCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && userProfile && !isLoading) {
      // Role-based redirect - only admin or customer
      if (userProfile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, userProfile, isLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInData.email || !signInData.password) {
      setErrors({ form: 'Please fill in all fields' });
      return;
    }
    
    setAuthLoading(true);
    setErrors({});
    
    const { error } = await signIn(signInData.email, signInData.password);
    if (error) {
      setErrors({ form: error.message });
    }
    
    setAuthLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showOTPField) {
      return handleOTPVerification();
    }

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!signUpData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!signUpData.email || !/\S+@\S+\.\S+/.test(signUpData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (!signUpData.password || signUpData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setAuthLoading(true);

    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);

    if (error) {
      setErrors({ form: error.message });
    } else {
      setShowOTPField(true);
      toast({
        title: "Check Your Email!",
        description: "We've sent a verification code to your email address.",
      });
    }

    setAuthLoading(false);
  };

  const handleOTPVerification = async () => {
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }

    setAuthLoading(true);

    const { error } = await verifyOTP(signUpData.email, otpCode);

    if (error) {
      setErrors({ otp: error.message });
    }

    setAuthLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  {errors.form && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                      {errors.form}
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="signin-email">Email Address</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      placeholder="Enter your email"
                      disabled={authLoading}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        placeholder="Enter your password"
                        className="pr-10"
                        disabled={authLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700" 
                    disabled={authLoading}
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
                <CardTitle>Create Your Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  {errors.form && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                      {errors.form}
                    </div>
                  )}

                  {!showOTPField ? (
                    <>
                      <div>
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          value={signUpData.fullName}
                          onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                          placeholder="Enter your full name"
                        />
                        {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>}
                      </div>

                      <div>
                        <Label htmlFor="signup-email">Email Address</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                          placeholder="Enter your email"
                        />
                        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                      </div>

                      <div>
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          value={signUpData.password}
                          onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                          placeholder="Create a password"
                        />
                        {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
                      </div>

                      <div>
                        <Label htmlFor="signup-confirm">Confirm Password</Label>
                        <Input
                          id="signup-confirm"
                          type="password"
                          value={signUpData.confirmPassword}
                          onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                          placeholder="Confirm your password"
                        />
                        {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      <Mail className="w-16 h-16 mx-auto text-blue-600" />
                      <h3 className="text-xl font-semibold">Verify Your Email</h3>
                      <p className="text-gray-600">
                        We've sent a verification code to<br />
                        <span className="font-medium">{signUpData.email}</span>
                      </p>

                      <div className="flex justify-center">
                        <InputOTP value={otpCode} onChange={setOtpCode} maxLength={6}>
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
                      {errors.otp && <p className="text-sm text-red-600">{errors.otp}</p>}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700" 
                    disabled={authLoading}
                  >
                    {authLoading 
                      ? (showOTPField ? 'Verifying...' : 'Creating Account...') 
                      : (showOTPField ? 'Verify & Create Account' : 'Create Account')
                    }
                  </Button>

                  {showOTPField && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={() => {
                        setShowOTPField(false);
                        setOtpCode('');
                        setErrors({});
                      }}
                      className="w-full"
                    >
                      Back to Sign Up Form
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
