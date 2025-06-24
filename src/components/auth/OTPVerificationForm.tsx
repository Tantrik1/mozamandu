
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OTPVerificationFormProps {
  email: string;
  signUpData: any;
  onBack: () => void;
  onSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function OTPVerificationForm({ 
  email, 
  signUpData, 
  onBack, 
  onSuccess, 
  isLoading, 
  setIsLoading 
}: OTPVerificationFormProps) {
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOTP = async (isResend: boolean = false) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const { data, error: emailError } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email,
          code,
          name: signUpData.fullName,
        },
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        toast({
          title: "Error",
          description: "Failed to send verification code",
          variant: "destructive",
        });
        return false;
      }

      if (data?.debug_code) {
        toast({
          title: isResend ? "New Code Generated" : "Development Mode",
          description: `Your verification code is: ${data.debug_code}`,
          duration: 15000,
        });
      } else {
        toast({
          title: isResend ? "New Code Sent" : "Code Sent",
          description: "Please check your email for the verification code.",
        });
      }

      if (isResend) {
        setResendCooldown(60);
      }

      return true;
    } catch (error) {
      console.error('OTP sending error:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    await sendOTP(true);
    setIsLoading(false);
  };

  const verifyOTP = async () => {
    setIsLoading(true);

    try {
      // Verify OTP code
      const { data: verification, error: verifyError } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', otpCode)
        .gt('expires_at', new Date().toISOString())
        .eq('verified', false)
        .single();

      if (verifyError || !verification) {
        toast({
          title: "Invalid Code",
          description: "The verification code is invalid or expired. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Mark code as verified
      await supabase
        .from('email_verification_codes')
        .update({ verified: true })
        .eq('id', verification.id);

      // Create the user account
      const { error: signUpError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signUpData.fullName,
            role: 'customer',
          },
        },
      });

      if (signUpError) {
        toast({
          title: "Account Creation Failed",
          description: signUpError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created Successfully!",
          description: "Welcome to Mozamandu. You're now signed in.",
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div>
        <Mail className="w-16 h-16 mx-auto text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
        <p className="text-gray-600">
          We've sent a verification code to<br />
          <span className="font-medium">{email}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center">
          <InputOTP
            value={otpCode}
            onChange={setOtpCode}
            maxLength={6}
          >
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
        
        <Button 
          onClick={verifyOTP} 
          disabled={otpCode.length !== 6 || isLoading}
          className="w-full"
        >
          {isLoading ? 'Verifying...' : 'Verify & Create Account'}
        </Button>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Didn't receive the code?</p>
          <Button 
            variant="ghost" 
            onClick={handleResendOTP}
            disabled={resendCooldown > 0 || isLoading}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : isLoading 
                ? 'Sending...' 
                : 'Resend Code'
            }
          </Button>
        </div>

        <Button 
          variant="ghost" 
          onClick={onBack}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign Up
        </Button>
      </div>
    </div>
  );
}
