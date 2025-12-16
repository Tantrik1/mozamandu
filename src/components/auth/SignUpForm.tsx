import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

interface SignUpFormProps {
  onSuccess: () => void;
}

export const SignUpForm = memo(function SignUpForm({ onSuccess }: SignUpFormProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      newErrors.terms = 'You must agree to the terms';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    setErrors({});

    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName);

    if (error) {
      setErrors({ form: error.message });
      toast({
        title: "Account Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "Check your email for a verification link.",
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.form && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
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
          className="h-11 border-2 focus:border-red-500"
          disabled={isLoading}
        />
        {errors.fullName && <p className="text-sm text-red-600">{errors.fullName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={signUpData.email}
          onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
          placeholder="Enter your email"
          className="h-11 border-2 focus:border-red-500"
          disabled={isLoading}
        />
        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            value={signUpData.password}
            onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
            placeholder="Create a password (min 8 chars)"
            className="h-11 pr-10 border-2 focus:border-red-500"
            disabled={isLoading}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
        {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
        <Input
          id="signup-confirm"
          type="password"
          value={signUpData.confirmPassword}
          onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
          placeholder="Confirm your password"
          className="h-11 border-2 focus:border-red-500"
          disabled={isLoading}
        />
        {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
      </div>

      <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/20 border border-muted/50">
        <Checkbox
          id="terms"
          checked={agreeToTerms}
          onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
          disabled={isLoading}
          className="mt-0.5"
        />
        <Label htmlFor="terms" className="text-sm leading-relaxed">
          I agree to the{' '}
          <a href="/terms" target="_blank" className="text-red-600 hover:underline">
            Terms
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
        className="w-full h-11 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Creating...
          </div>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  );
});
