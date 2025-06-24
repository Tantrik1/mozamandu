
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { OTPVerificationForm } from '@/components/auth/OTPVerificationForm';
import { ContactInfoForm } from '@/components/customer/ContactInfoForm';

export default function Auth() {
  const { signIn, user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  
  const [authLoading, setAuthLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpData, setSignUpData] = useState<any>(null);
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (user && userProfile && !isLoading) {
      console.log('User authenticated, checking profile:', userProfile);
      
      // Check if contact info is missing for first-time users
      if (!userProfile.contact_number) {
        setShowContactForm(true);
        return;
      }

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

  const handleOTPSent = (email: string, formData: any) => {
    setSignUpEmail(email);
    setSignUpData(formData);
    setShowOTP(true);
  };

  const handleVerificationSuccess = () => {
    setShowOTP(false);
    // The useEffect will handle the redirect once the user is authenticated
  };

  const handleContactInfoComplete = () => {
    setShowContactForm(false);
    // Redirect after contact info is collected
    if (redirectTo) {
      navigate(redirectTo);
    } else if (userProfile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
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

  // Show contact form for first-time users
  if (showContactForm && user && userProfile) {
    return (
      <ContactInfoForm 
        userId={user.id} 
        onComplete={handleContactInfoComplete} 
      />
    );
  }

  // Show OTP verification
  if (showOTP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <OTPVerificationForm
              email={signUpEmail}
              signUpData={signUpData}
              onBack={() => setShowOTP(false)}
              onSuccess={handleVerificationSuccess}
              isLoading={authLoading}
              setIsLoading={setAuthLoading}
            />
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
                <CardTitle>Welcome Back</CardTitle>
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
                <CardTitle>Create Your Account</CardTitle>
              </CardHeader>
              <CardContent>
                <SignUpForm 
                  onOTPSent={handleOTPSent}
                  isLoading={authLoading}
                  setIsLoading={setAuthLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
