
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
  verifyOTP: (email: string, otp: string) => Promise<{ error: any }>;
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
          fetchUserProfile(session.user.id);
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
      
      // Generate OTP and send via Resend
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Send OTP email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.trim(),
          name: fullName.trim(),
          otp: otpCode,
        },
      });

      if (emailError) {
        return { error: emailError };
      }

      // Store user data temporarily (not creating auth user yet)
      sessionStorage.setItem('pendingSignup', JSON.stringify({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        otp: otpCode,
      }));

      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      setIsLoading(true);
      
      const pendingData = sessionStorage.getItem('pendingSignup');
      if (!pendingData) {
        return { error: { message: 'No pending signup found' } };
      }

      const { password, fullName, otp: storedOtp } = JSON.parse(pendingData);

      if (otp !== storedOtp) {
        return { error: { message: 'Invalid verification code' } };
      }

      // Create the actual user account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            role: 'customer',
          },
        },
      });

      if (signUpError) {
        return { error: signUpError };
      }

      // Clear pending data
      sessionStorage.removeItem('pendingSignup');

      toast({
        title: "Account created successfully!",
        description: "Welcome to Mozamandu!",
      });

      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      await supabase.auth.signOut();
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      // Redirect to home
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
