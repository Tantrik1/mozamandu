
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: any }>;
  resendOTP: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        return { error };
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setIsLoading(true);
      
      console.log('Sending OTP signup request for:', email.trim().toLowerCase());

      // Send OTP via edge function
      const { data, error: otpError } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: email.trim().toLowerCase(),
          name: fullName.trim(),
          password,
          type: 'signup'
        },
      });

      console.log('OTP signup response:', data, otpError);

      if (otpError) {
        console.error('OTP signup error:', otpError);
        return { error: otpError };
      }

      if (!data?.success) {
        console.error('OTP signup failed:', data);
        return { error: { message: data?.error || 'Failed to send verification code' } };
      }

      return { error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      setIsLoading(true);
      
      console.log('Verifying OTP for:', email.trim().toLowerCase());

      // Verify OTP using Supabase's built-in method
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'signup'
      });

      console.log('OTP verification response:', data, error);

      if (error) {
        console.error('OTP verification error:', error);
        return { error };
      }

      console.log('OTP verified successfully');

      toast({
        title: "Email Verified!",
        description: "Your account has been created successfully.",
      });

      return { error: null };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async (email: string) => {
    try {
      setIsLoading(true);
      
      console.log('Resending OTP for:', email.trim().toLowerCase());

      // Resend OTP via edge function
      const { data, error: otpError } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: email.trim().toLowerCase(),
          type: 'resend'
        },
      });

      console.log('OTP resend response:', data, otpError);

      if (otpError) {
        console.error('OTP resend error:', otpError);
        return { error: otpError };
      }

      if (!data?.success) {
        console.error('OTP resend failed:', data);
        return { error: { message: data?.error || 'Failed to resend verification code' } };
      }

      return { error: null };
    } catch (error) {
      console.error('OTP resend error:', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      // Force redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userProfile,
      isLoading,
      signIn,
      signUp,
      verifyOTP,
      resendOTP,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
