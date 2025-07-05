import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { signIn, user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);

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

  // Redirect authenticated users
  useEffect(() => {
    if (user && userProfile && !isLoading) {
      // Only redirect if email is confirmed
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
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-gradient-to-br from-white via-red-50 to-red-100 relative overflow-hidden">
      {/* Animated SVG background */}
      <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="200" cy="200" r="180" fill="#fee2e2" opacity="0.5">
          <animate attributeName="cy" values="200;300;200" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="1240" cy="700" r="180" fill="#fecaca" opacity="0.4">
          <animate attributeName="cy" values="700;600;700" dur="7s" repeatCount="indefinite" />
        </circle>
        <rect x="600" y="100" width="240" height="240" rx="120" fill="#fca5a5" opacity="0.15">
          <animate attributeName="x" values="600;650;600" dur="8s" repeatCount="indefinite" />
        </rect>
      </svg>
      {/* Hero Section */}
      <div className="hidden md:flex flex-col items-start justify-center w-1/2 h-full pl-16 z-10">
        <div className="mb-8">
          <img src="/public/favicon.ico" alt="Mozamandu Logo" className="w-16 h-16 mb-4 drop-shadow-lg animate-bounce-slow" />
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight leading-tight">Welcome to Mozamandu</h1>
          <p className="text-lg text-gray-700 mb-4">Your premium gear destination. Shop the latest, most stylish, and comfortable gear for every adventure.</p>
          <div className="flex gap-2 mt-2">
            <span className="inline-block bg-red-100 text-red-600 font-semibold px-3 py-1 rounded-full text-xs animate-pulse">Fast Signup</span>
            <span className="inline-block bg-red-200 text-red-700 font-semibold px-3 py-1 rounded-full text-xs animate-pulse">Verified Security</span>
            <span className="inline-block bg-red-50 text-red-500 font-semibold px-3 py-1 rounded-full text-xs animate-pulse">Exclusive Offers</span>
          </div>
        </div>
        {/* Why Join Panel */}
        <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-xl shadow-lg p-6 w-[350px]">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Why join Mozamandu?</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li>✓ Get access to exclusive member-only deals</li>
            <li>✓ Track your orders and manage your profile</li>
            <li>✓ Fast, secure, and easy checkout</li>
            <li>✓ Personalized recommendations</li>
            <li>✓ Early access to new arrivals</li>
          </ul>
        </div>
      </div>
      {/* Auth Card */}
      <div className="w-full md:w-[420px] max-w-md space-y-8 p-8 z-10 rounded-2xl shadow-2xl bg-white/80 backdrop-blur-md border border-white/30 mx-auto md:mr-16 my-12 md:my-0 animate-fade-in">
        <div className="text-center flex flex-col items-center gap-2">
          <img src="/public/favicon.ico" alt="Mozamandu Logo" className="w-12 h-12 mb-1 drop-shadow-lg animate-bounce-slow" />
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mozamandu</h2>
          <p className="mt-1 text-base text-gray-700 font-medium">Your premium gear destination</p>
          <span className="text-xs text-red-500 font-semibold tracking-widest uppercase">Shop. Style. Stand Out.</span>
        </div>

        {/* Show email sent confirmation */}
        {showEmailSent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Check Your Email!</p>
              <p className="text-sm text-blue-600">We've sent you a verification link. Please verify your email before signing in.</p>
            </div>
          </div>
        )}

        {/* Show confirmation message if coming from email verification */}
        {searchParams.get('confirmed') === 'true' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Email Verified!</p>
              <p className="text-sm text-green-600">You can now sign in to your account.</p>
            </div>
          </div>
        )}

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
                <SignUpForm onSuccess={handleSignUpSuccess} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <style>{`
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(.4,0,.6,1) infinite;
        }
        .animate-bounce-slow {
          animation: bounce 2.5s infinite;
        }
        .animate-fade-in {
          animation: fadeIn 1.2s cubic-bezier(.4,0,.6,1);
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
