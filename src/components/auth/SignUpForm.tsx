
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      console.log('Attempting signup with:', signUpData.email);
      
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: signUpData.fullName,
            role: 'customer',
          },
        },
      });

      console.log('Signup response:', { data, error });

      if (error) {
        console.error('Signup error:', error);
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Signup successful, user created:', data.user?.id);
        toast({
          title: "Account Created!",
          description: "Please check your email and click the verification link to activate your account.",
        });
        onSuccess();
      }
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

      <Button 
        type="submit" 
        className="w-full bg-red-600 hover:bg-red-700" 
        disabled={isLoading}
      >
        {isLoading ? 'Creating Account...' : 'Sign Up'}
      </Button>
    </form>
  );
}
