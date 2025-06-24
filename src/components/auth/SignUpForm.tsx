
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { OTPVerificationForm } from './OTPVerificationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface SignUpFormProps {
  onSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function SignUpForm({ onSuccess, isLoading, setIsLoading }: SignUpFormProps) {
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const validatePassword = (password: string) => {
    const requirements = [
      { test: password.length >= 8, message: 'Password must be at least 8 characters long' },
      { test: /[A-Z]/.test(password), message: 'Password must contain an uppercase letter' },
      { test: /[a-z]/.test(password), message: 'Password must contain a lowercase letter' },
      { test: /\d/.test(password), message: 'Password must contain a number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'Password must contain a special character' }
    ];

    const failedRequirement = requirements.find(req => !req.test);
    return failedRequirement ? failedRequirement.message : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    // Validate full name
    if (!signUpData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // Validate email
    if (!signUpData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(signUpData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate password
    const passwordError = validatePassword(signUpData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Validate confirm password
    if (signUpData.password !== signUpData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the Terms and Conditions to continue';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Please fix the following errors:",
        description: Object.values(newErrors)[0],
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', signUpData.email)
        .single();

      if (existingUser) {
        toast({
          title: "Account Already Exists",
          description: "An account with this email already exists. Please sign in instead.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Generate and send OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data, error: emailError } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: signUpData.email,
          code: otpCode,
          name: signUpData.fullName,
        },
      });

      if (emailError || !data?.success) {
        console.error('OTP sending error:', emailError);
        toast({
          title: "Error",
          description: "Failed to send verification code. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the verification code.",
      });

      setShowOTPForm(true);
    } catch (error) {
      console.error('Unexpected signup error:', error);
      toast({
        title: "Sign Up Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    setShowOTPForm(false);
    onSuccess();
  };

  const handleBackToSignUp = () => {
    setShowOTPForm(false);
  };

  if (showOTPForm) {
    return (
      <OTPVerificationForm
        email={signUpData.email}
        signUpData={signUpData}
        onBack={handleBackToSignUp}
        onSuccess={handleOTPSuccess}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="signup-name">Full Name *</Label>
        <Input
          id="signup-name"
          type="text"
          value={signUpData.fullName}
          onChange={(e) => {
            setSignUpData({ ...signUpData, fullName: e.target.value });
            if (errors.fullName) setErrors({ ...errors, fullName: '' });
          }}
          placeholder="Enter your full name"
          className={errors.fullName ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.fullName && (
          <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>
        )}
      </div>

      <div>
        <Label htmlFor="signup-email">Email Address *</Label>
        <Input
          id="signup-email"
          type="email"
          value={signUpData.email}
          onChange={(e) => {
            setSignUpData({ ...signUpData, email: e.target.value });
            if (errors.email) setErrors({ ...errors, email: '' });
          }}
          placeholder="Enter your email"
          className={errors.email ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <Label htmlFor="signup-password">Password *</Label>
        <Input
          id="signup-password"
          type="password"
          value={signUpData.password}
          onChange={(e) => {
            setSignUpData({ ...signUpData, password: e.target.value });
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          placeholder="Create a strong password"
          className={errors.password ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password}</p>
        )}
        <PasswordStrengthIndicator password={signUpData.password} />
      </div>

      <div>
        <Label htmlFor="signup-confirm-password">Confirm Password *</Label>
        <Input
          id="signup-confirm-password"
          type="password"
          value={signUpData.confirmPassword}
          onChange={(e) => {
            setSignUpData({ ...signUpData, confirmPassword: e.target.value });
            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
          }}
          placeholder="Confirm your password"
          className={errors.confirmPassword ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="accept-terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => {
              setAcceptedTerms(checked as boolean);
              if (errors.terms) setErrors({ ...errors, terms: '' });
            }}
            className="mt-1"
            disabled={isLoading}
          />
          <Label htmlFor="accept-terms" className="text-sm leading-5 cursor-pointer">
            I accept the{' '}
            <Link to="/terms" target="_blank" className="text-red-600 hover:text-red-700 underline">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="text-red-600 hover:text-red-700 underline">
              Privacy Policy
            </Link>
          </Label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-600">{errors.terms}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full bg-red-600 hover:bg-red-700" 
        disabled={isLoading || !acceptedTerms}
      >
        {isLoading ? 'Sending Verification Code...' : 'Continue'}
      </Button>
    </form>
  );
}
