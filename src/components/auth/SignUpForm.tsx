
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SignUpFormProps {
  onSuccess: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if password meets all criteria
  const isPasswordStrong = (password: string) => {
    const requirements = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ];
    return requirements.every(req => req);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!signUpData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!signUpData.email || !/\S+@\S+\.\S+/.test(signUpData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (!signUpData.password || signUpData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);

    if (error) {
      console.error('Signup error:', error);
      let errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('Password')) {
        errorMessage = 'Password must be at least 6 characters long.';
      }
      
      setErrors({ form: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "We've sent you a confirmation email. Please check your inbox and spam folder to verify your account.",
        duration: 6000,
      });
      // Redirect to home page
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {errors.form}
          </div>
        )}

        <div>
          <Label htmlFor="signup-name">Full Name</Label>
          <Input
            id="signup-name"
            type="text"
            value={signUpData.fullName}
            onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
            placeholder="Enter your full name"
            disabled={isLoading}
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
            disabled={isLoading}
          />
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="signup-password">Password</Label>
            {signUpData.password && !isPasswordStrong(signUpData.password) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-4 w-4 text-orange-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <PasswordStrengthIndicator password={signUpData.password} />
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={signUpData.password}
              onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
              placeholder="Create a password"
              className="pr-10"
              disabled={isLoading}
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
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={agreeToTerms}
            onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
            disabled={isLoading}
          />
          <Label htmlFor="terms" className="text-sm">
            I agree to the{' '}
            <a href="/terms" target="_blank" className="text-red-600 hover:underline">
              Terms and Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-red-600 hover:underline">
              Privacy Policy
            </a>
          </Label>
        </div>
        {errors.terms && <p className="text-sm text-red-600">{errors.terms}</p>}

        <Button 
          type="submit" 
          className="w-full bg-red-600 hover:bg-red-700" 
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </TooltipProvider>
  );
}
