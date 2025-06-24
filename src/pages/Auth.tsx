
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
  const [activeTab, setActiveTab] = useState('signin');
  
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
    console.log('Signup successful and verified');
    // The useEffect will handle the redirect now that the user is authenticated
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
