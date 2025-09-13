
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Mail, Shield, ArrowLeft, Sparkles, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
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
      // Only redirect if email is confirmed
      if (user.email_confirmed_at) {
        console.log('🔄 Auth: Redirecting authenticated user with role:', userProfile.role);
        
        // Route based on user role
        if (userProfile.role === 'admin') {
          navigate('/admin');
        } else if (userProfile.role === 'customer') {
          navigate('/dashboard');
        } else {
          // Default to dashboard for any other roles
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
      console.log('🔄 Sending password reset email to:', resetEmail);
      
      // Use only Supabase's built-in password reset (which sends the proper tokens)
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (supabaseError) {
        console.error('❌ Supabase password reset error:', supabaseError);
        toast({
          title: "Reset Failed",
          description: supabaseError.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ Password reset email sent successfully via Supabase');
        toast({
          title: "Reset Email Sent!",
          description: "Check your email for a password reset link from Supabase.",
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }

    } catch (error) {
      console.error('❌ Password reset exception:', error);
      toast({
        title: "Reset Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setResetLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-red-200 border-t-red-600 mx-auto"></div>
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-red-600 animate-float" />
          </div>
          <p className="text-muted-foreground font-medium">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50 p-4">
        <div className="w-full max-w-md">
          <Card className="animate-slide-up shadow-2xl border-0 backdrop-blur-sm bg-white/95">
            <CardHeader className="text-center pb-6 relative">
              <button 
                onClick={() => setShowForgotPassword(false)}
                className="absolute left-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 shadow-lg">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
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
                    className="h-12 border-2 focus:border-red-500 transition-colors bg-white/50 backdrop-blur-sm"
                    disabled={resetLoading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending Reset Link...
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 shadow-xl animate-float">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
            Mozamandu
          </h1>
          <p className="text-muted-foreground font-medium">
            Your premium gear destination
          </p>
        </div>

        {/* Status Messages */}
        {showEmailSent && (
          <div className="mb-6 animate-slide-up">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3 shadow-lg backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-blue-800">Check Your Email!</p>
                <p className="text-sm text-blue-600">We've sent you a verification link. Please verify your email before signing in.</p>
              </div>
            </div>
          </div>
        )}

        {searchParams.get('confirmed') === 'true' && (
          <div className="mb-6 animate-slide-up">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3 shadow-lg backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-green-800">Email Verified!</p>
                <p className="text-sm text-green-600">You can now sign in to your account.</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Auth Card */}
        <Card className="animate-slide-up shadow-2xl border-0 backdrop-blur-sm bg-white/95 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-lg h-12 backdrop-blur-sm">
                <TabsTrigger 
                  value="signin" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-red-600 font-semibold transition-all duration-300 h-10 text-sm px-3"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-red-600 font-semibold transition-all duration-300 h-10 text-sm px-3"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="signin" className="m-0 mt-0">
              <CardHeader className="text-center pb-6 px-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
                <p className="text-muted-foreground">Sign in to your account to continue</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  {errors.form && (
                    <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg animate-fade-in backdrop-blur-sm">
                      {errors.form}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium text-gray-700">Email Address</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      placeholder="Enter your email"
                      className="h-12 border-2 focus:border-red-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                      disabled={authLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        placeholder="Enter your password"
                        className="h-12 pr-12 border-2 focus:border-red-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                        disabled={authLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-muted/50 rounded-r-lg transition-colors"
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
                      className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Signing In...
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="signup" className="m-0 mt-0">
              <CardHeader className="text-center pb-6 px-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Create Account</CardTitle>
                <p className="text-muted-foreground">Join Mozamandu for exclusive gear access</p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <SignUpForm onSuccess={handleSignUpSuccess} />
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-muted-foreground animate-fade-in">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link to="/terms" className="hover:text-red-600 transition-colors font-medium">
              Terms & Conditions
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/privacy" className="hover:text-red-600 transition-colors font-medium">
              Privacy Policy
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/shipping" className="hover:text-red-600 transition-colors font-medium">
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
