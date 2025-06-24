
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';

interface SignUpFormProps {
  onSuccess: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signUp, verifyOTP, resendOTP } = useAuth();
  const [showOTPField, setShowOTPField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [otpCode, setOtpCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);
    setErrors({});

    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);

    if (error) {
      setErrors({ form: error.message });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setShowOTPField(true);
      toast({
        title: "Verification Code Sent!",
        description: "Please check your email for the 6-digit verification code.",
      });
    }

    setIsLoading(false);
  };

  const handleOTPVerification = async () => {
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    const { error } = await verifyOTP(signUpData.email, otpCode);

    if (error) {
      setErrors({ otp: error.message });
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "Welcome to Mozamandu. You're now signed in.",
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setErrors({});
    setOtpCode('');

    const { error } = await resendOTP(signUpData.email);

    if (error) {
      setErrors({ form: error.message });
      toast({
        title: "Error",
        description: "Failed to resend verification code. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Code Resent!",
        description: "A new verification code has been sent to your email.",
      });
    }

    setIsResending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                value={signUpData.password}
                onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                placeholder="Create a password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
          <p className="text-sm text-blue-600 font-medium">
            Check your email for the 6-digit code
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

          <Button
            type="button"
            variant="ghost"
            onClick={handleResendOTP}
            disabled={isResending}
            className="w-full mt-4"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
            {isResending ? 'Sending...' : 'Resend Verification Code'}
          </Button>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full bg-red-600 hover:bg-red-700" 
        disabled={isLoading}
      >
        {isLoading 
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
  );
}
