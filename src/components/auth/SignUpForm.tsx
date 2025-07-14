
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SignUpFormProps {
  onSuccess: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signUp } = useAuth();
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
      setErrors({ form: error.message });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "We've sent you a verification email. Please check your inbox and verify your account before signing in.",
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.form && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
            {errors.form}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
          <Input
            id="signup-name"
            type="text"
            value={signUpData.fullName}
            onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
            placeholder="Enter your full name"
            className="h-12 border-2 focus:border-red-500 transition-all duration-300"
            disabled={isLoading}
          />
          {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
          <Input
            id="signup-email"
            type="email"
            value={signUpData.email}
            onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
            placeholder="Enter your email"
            className="h-12 border-2 focus:border-red-500 transition-all duration-300"
            disabled={isLoading}
          />
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
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
              className="h-12 pr-12 border-2 focus:border-red-500 transition-all duration-300"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-muted/50 rounded-r-lg transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
          <Input
            id="signup-confirm"
            type="password"
            value={signUpData.confirmPassword}
            onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            className="h-12 border-2 focus:border-red-500 transition-all duration-300"
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
          <Checkbox
            id="terms"
            checked={agreeToTerms}
            onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed">
            I agree to the{' '}
            <a href="/terms" target="_blank" className="text-red-600 hover:text-red-700 font-medium hover:underline transition-colors">
              Terms and Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-red-600 hover:text-red-700 font-medium hover:underline transition-colors">
              Privacy Policy
            </a>
          </Label>
        </div>
        {errors.terms && <p className="text-sm text-red-600">{errors.terms}</p>}

        <Button 
          type="submit" 
          className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Creating Account...
            </div>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </TooltipProvider>
  );
}
