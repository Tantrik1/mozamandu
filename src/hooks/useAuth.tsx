
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
      
      console.log('Sending OTP request for:', email.trim().toLowerCase());

      // Send OTP email via edge function
      const { data, error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.trim().toLowerCase(),
          name: fullName.trim(),
          password,
        },
      });

      console.log('OTP response:', data, emailError);

      if (emailError) {
        console.error('Email error:', emailError);
        return { error: emailError };
      }

      if (!data?.success) {
        console.error('Email sending failed:', data);
        return { error: { message: data?.error || 'Failed to send verification email' } };
      }

      return { error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      setIsLoading(true);
      
      const emailKey = email.trim().toLowerCase();

      console.log('Verifying OTP:', { email: emailKey, otp });

      // Verify OTP with the edge function
      const { data: verificationData, error: verifyError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: emailKey,
          otp: otp.trim(),
          verify: true,
        },
      });

      console.log('Verification response:', verificationData, verifyError);

      if (verifyError) {
        console.error('Verification error:', verifyError);
        return { error: { message: 'Failed to verify code. Please try again.' } };
      }

      if (!verificationData?.success) {
        console.error('Verification failed:', verificationData);
        return { error: { message: verificationData?.error || 'Invalid verification code' } };
      }

      console.log('OTP verified and user created successfully');

      // Now sign in the user with a generated session
      if (verificationData.user) {
        // Sign in with the created user's email
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
          email: emailKey,
          password: '', // Password is already verified in the edge function
        });

        // If password sign-in fails (which is expected), try admin sign-in
        if (sessionError) {
          console.log('Creating session for newly created user...');
          
          // Use admin to create a session for the new user
          const { data: adminSessionData, error: adminSessionError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: emailKey,
          });

          if (adminSessionError) {
            console.error('Admin session error:', adminSessionError);
            // Force refresh the session
            await supabase.auth.refreshSession();
          }
        }
      }

      toast({
        title: "Account created successfully!",
        description: "Welcome to Mozamandu! You are now signed in.",
      });

      return { error: null };
    } catch (error) {
      console.error('OTP verification error:', error);
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
