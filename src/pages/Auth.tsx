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
import { motion } from 'framer-motion';

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Full-bleed animated gradient background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 w-full h-full z-0"
        style={{
          background: 'linear-gradient(135deg, #E8353D 0%, #ff6a6a 50%, #fff 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientMove 10s ease-in-out infinite',
        }}
      />
      {/* Subtle overlay for text contrast */}
      <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />
      {/* Animated/futuristic floating socks SVGs (left & right) */}
      <motion.div
        className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-20"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1, rotate: [0, 10, -10, 0] }}
        transition={{ duration: 1.2, delay: 0.3, repeat: Infinity, repeatType: 'reverse', repeatDelay: 2 }}
      >
        {/* Left animated sock SVG */}
        <svg width="90" height="180" viewBox="0 0 90 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#sockShadow)">
            <path d="M30 10 Q40 60 20 120 Q10 160 50 170 Q80 175 70 120 Q60 60 70 10" fill="#fff" stroke="#E8353D" strokeWidth="6" />
            <circle cx="40" cy="40" r="8" fill="#E8353D" />
            <circle cx="60" cy="80" r="6" fill="#E8353D" />
            <rect x="25" y="0" width="40" height="18" rx="8" fill="#E8353D" />
          </g>
          <defs>
            <filter id="sockShadow" x="0" y="0" width="90" height="180" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#E8353D" floodOpacity="0.2" />
            </filter>
          </defs>
        </svg>
      </motion.div>
      <motion.div
        className="hidden md:block absolute right-0 top-1/3 z-20"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1, rotate: [0, -8, 8, 0] }}
        transition={{ duration: 1.2, delay: 0.6, repeat: Infinity, repeatType: 'reverse', repeatDelay: 2 }}
      >
        {/* Right animated sock SVG */}
        <svg width="90" height="180" viewBox="0 0 90 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#sockShadow2)">
            <path d="M60 10 Q50 60 70 120 Q80 160 40 170 Q10 175 20 120 Q30 60 20 10" fill="#fff" stroke="#E8353D" strokeWidth="6" />
            <circle cx="50" cy="60" r="8" fill="#E8353D" />
            <circle cx="30" cy="100" r="6" fill="#E8353D" />
            <rect x="25" y="0" width="40" height="18" rx="8" fill="#E8353D" />
          </g>
          <defs>
            <filter id="sockShadow2" x="0" y="0" width="90" height="180" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#E8353D" floodOpacity="0.2" />
            </filter>
          </defs>
        </svg>
      </motion.div>
      {/* Centered content: logo, title, description, form */}
      <div className="relative z-30 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-4 py-12">
        {/* Animated logo above card */}
        <motion.img
          src="/lovable-uploads/mozamandu-logo.png"
          alt="Mozamandu Logo"
          className="w-24 h-24 mb-4 drop-shadow-xl"
          initial={{ y: -60, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.2 }}
        />
        {/* Title and description with text shadow for contrast */}
        <motion.h1
          className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          Mozamandu
        </motion.h1>
        <motion.p
          className="text-lg md:text-xl text-white/90 mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          Gentle on feet. Shop the latest, most stylish, and comfortable gear for every adventure.
        </motion.p>
        {/* Animated card for form */}
        <motion.div
          className="w-full bg-white/90 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-8"
          initial={{ opacity: 0, y: 60, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.7, type: 'spring', stiffness: 100, damping: 14 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-[#E8353D] drop-shadow">Welcome Back</CardTitle>
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
                  <CardTitle className="text-center text-[#E8353D] drop-shadow">Create Your Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <SignUpForm onSuccess={handleSignUpSuccess} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
