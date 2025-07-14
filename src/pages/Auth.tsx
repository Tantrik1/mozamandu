
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

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({
        title: "Reset Failed",
        description: error.message,
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
          <Card className="animate-slide-up shadow-2xl border-0 backdrop-blur-sm bg-white/80">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center mb-4">
                <button 
                  onClick={() => setShowForgotPassword(false)}
                  className="absolute left-6 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="p-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500">
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
            <CardContent>
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
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 shadow-lg animate-float">
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
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 flex items-center space-x-3 shadow-lg">
              <div className="p-2 rounded-lg bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Check Your Email!</p>
                <p className="text-sm text-blue-600">We've sent you a verification link. Please verify your email before signing in.</p>
              </div>
            </div>
          </div>
        )}

        {searchParams.get('confirmed') === 'true' && (
          <div className="mb-6 animate-slide-up">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3 shadow-lg">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Email Verified!</p>
                <p className="text-sm text-green-600">You can now sign in to your account.</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Auth Card */}
        <Card className="animate-slide-up shadow-2xl border-0 backdrop-blur-sm bg-white/80">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 m-6 mb-0 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger 
                value="signin" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-red-600 font-semibold transition-all duration-300"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-red-600 font-semibold transition-all duration-300"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="m-0">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                <p className="text-muted-foreground">Sign in to your account to continue</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-6">
                  {errors.form && (
                    <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                      {errors.form}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      placeholder="Enter your email"
                      className="h-12 border-2 focus:border-red-500 transition-all duration-300"
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
                        className="h-12 pr-12 border-2 focus:border-red-500 transition-all duration-300"
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
            
            <TabsContent value="signup" className="m-0">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                <p className="text-muted-foreground">Join Mozamandu for exclusive gear access</p>
              </CardHeader>
              <CardContent>
                <SignUpForm onSuccess={handleSignUpSuccess} />
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-muted-foreground animate-fade-in">
          <div className="flex justify-center space-x-4">
            <Link to="/terms" className="hover:text-red-600 transition-colors font-medium">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-red-600 transition-colors font-medium">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/shipping" className="hover:text-red-600 transition-colors font-medium">
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
