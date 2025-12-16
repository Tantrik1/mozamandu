import { useState, useEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Mail, ArrowLeft, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Memoized loading spinner
const LoadingSpinner = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50/30">
    <div className="text-center">
      <div className="w-10 h-10 border-2 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
));
LoadingSpinner.displayName = 'LoadingSpinner';

function Auth() {
  const { signIn, user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check for email confirmation
  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    if (confirmed === 'true') {
      toast({
        title: "Email Confirmed!",
        description: "Your email has been verified. You can now sign in to your account.",
      });
      setActiveTab('signin');
    }
  }, [searchParams]);

  // Redirect authenticated users based on role
  useEffect(() => {
    if (user && userProfile && !isLoading) {
      const currentPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const isPasswordResetFlow = currentPath === '/reset-password' || 
                                  urlParams.get('type') === 'recovery' || 
                                  urlParams.has('access_token');
      
      if (isPasswordResetFlow) return;
      
      if (user.email_confirmed_at) {
        if (userProfile.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
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

  const handleSignUpSuccess = () => {
    setShowEmailSent(true);
    setActiveTab('signin');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        toast({
          title: "Reset Failed",
          description: resetError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset Email Sent!",
          description: "Check your email for a password reset link.",
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }

    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setResetLoading(false);
  };

  // Don't block render for auth loading - show page immediately

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50/30 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="text-center pb-6 relative">
              <button 
                onClick={() => setShowForgotPassword(false)}
                className="absolute left-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">
                Reset Password
              </CardTitle>
              <p className="text-muted-foreground">
                Enter your email to receive a password reset link
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="h-12 border-2 focus:border-red-500 transition-colors"
                    disabled={resetLoading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50/30 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            Mozamandu
          </h1>
          <p className="text-muted-foreground">
            Your premium gear destination
          </p>
        </div>

        {/* Status Messages */}
        {showEmailSent && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-blue-800">Check Your Email!</p>
                <p className="text-sm text-blue-600">Verify your email before signing in.</p>
              </div>
            </div>
          </div>
        )}

        {searchParams.get('confirmed') === 'true' && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-green-800">Email Verified!</p>
                <p className="text-sm text-green-600">You can now sign in.</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Auth Card */}
        <Card className="shadow-xl border-0 bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-lg h-12">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-red-600 font-semibold h-10"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-red-600 font-semibold h-10"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="signin" className="m-0">
              <CardHeader className="text-center pb-6 px-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
                <p className="text-muted-foreground">Sign in to continue</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleSignIn} className="space-y-5">
                  {errors.form && (
                    <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                      {errors.form}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      placeholder="Enter your email"
                      className="h-11 border-2 focus:border-red-500"
                      disabled={authLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        placeholder="Enter your password"
                        className="h-11 pr-10 border-2 focus:border-red-500"
                        disabled={authLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg"
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Signing In...
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="signup" className="m-0">
              <CardHeader className="text-center pb-6 px-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Create Account</CardTitle>
                <p className="text-muted-foreground">Join Mozamandu today</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <SignUpForm onSuccess={handleSignUpSuccess} />
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link to="/terms" className="hover:text-red-600 transition-colors">
              Terms & Conditions
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/privacy" className="hover:text-red-600 transition-colors">
              Privacy Policy
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/shipping" className="hover:text-red-600 transition-colors">
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Auth);
