
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ContactInfoForm } from '@/components/customer/ContactInfoForm';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { signIn, user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  
  const [authLoading, setAuthLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validateSignInForm = () => {
    const newErrors: Record<string, string> = {};

    if (!signInData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(signInData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!signInData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignInForm()) {
      return;
    }
    
    setAuthLoading(true);
    setErrors({});
    
    try {
      const { error } = await signIn(signInData.email, signInData.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ form: 'Invalid email or password. Please try again.' });
        } else {
          setErrors({ form: error.message });
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setErrors({ form: 'An unexpected error occurred. Please try again.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUpSuccess = () => {
    setSignUpSuccess(true);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
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

  // Show success message after signup
  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600">
                We've sent you a verification link. Please check your email and click the link to verify your account.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Don't forget to check your spam folder!
              </p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setSignUpSuccess(false)}
              className="w-full"
            >
              Back to Sign In
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
                      onChange={(e) => {
                        setSignInData({ ...signInData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      placeholder="Enter your email"
                      className={errors.email ? 'border-red-500' : ''}
                      disabled={authLoading}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) => {
                        setSignInData({ ...signInData, password: e.target.value });
                        if (errors.password) setErrors({ ...errors, password: '' });
                      }}
                      placeholder="Enter your password"
                      className={errors.password ? 'border-red-500' : ''}
                      disabled={authLoading}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                    )}
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
                <SignUpForm 
                  onSuccess={handleSignUpSuccess}
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
