
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 AuthProvider: Starting auth initialization');

    // Set timeout fallback for loading state
    loadingTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('⚠️ AuthProvider: Loading timeout after 10 seconds, forcing completion');
        setIsLoading(false);
      }
    }, 10000);

    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthProvider: Getting initial session');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthProvider: Error getting session:', error);
        } else {
          console.log('✅ AuthProvider: Initial session retrieved:', session?.user?.email || 'No session');
        }

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('🔄 AuthProvider: Fetching user profile');
          fetchUserProfile(session.user.id).catch(console.error);
        }
        
      } catch (error) {
        console.error('❌ AuthProvider: Auth initialization error:', error);
      } finally {
        if (isMounted) {
          console.log('✅ AuthProvider: Auth initialization complete, setting loading to false');
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔄 AuthProvider: Auth state changed:', event, session?.user?.email || 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user email is confirmed
          if (!session.user.email_confirmed_at) {
            console.warn('⚠️ AuthProvider: User email not confirmed');
            toast({
              title: "Email Not Verified",
              description: "Please check your email and verify your account before signing in.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            return;
          }
          
          fetchUserProfile(session.user.id).catch(console.error);
        } else {
          setUserProfile(null);
        }
        
        // Ensure loading is always set to false after auth state change
        console.log('✅ AuthProvider: Auth state change complete, setting loading to false');
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      }
    );

    initializeAuth();

    return () => {
      console.log('🧹 AuthProvider: Cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('🔄 AuthProvider: Fetching user profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ AuthProvider: Error fetching user profile:', error);
        return;
      }

      console.log('✅ AuthProvider: User profile fetched:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('❌ AuthProvider: Profile fetch error:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔄 AuthProvider: Starting sign in');
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        console.error('❌ AuthProvider: Sign in error:', error);
        setIsLoading(false);
        
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          return { error: { message: 'Please verify your email before signing in. Check your inbox for the verification link.' } };
        }
        
        return { error };
      }
      
      // Check if email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        console.warn('⚠️ AuthProvider: User email not confirmed');
        await supabase.auth.signOut();
        setIsLoading(false);
        return { error: { message: 'Please verify your email before signing in. Check your inbox for the verification link.' } };
      }
      
      console.log('✅ AuthProvider: Sign in successful');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      return { error: null };
    } catch (error) {
      console.error('❌ AuthProvider: Sign in exception:', error);
      setIsLoading(false);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('🔄 AuthProvider: Starting sign up');
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'customer'
          },
          emailRedirectTo: `${window.location.origin}/auth?confirmed=true`
        }
      });

      if (error) {
        console.error('❌ AuthProvider: Sign up error:', error);
        setIsLoading(false);
        return { error };
      }

      console.log('✅ AuthProvider: Sign up successful', data);
      
      // If user needs to confirm email
      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Check Your Email",
          description: "We've sent you a verification link. Please check your email and click the link to verify your account before signing in.",
        });
      }
      
      setIsLoading(false);
      return { error: null };
    } catch (error) {
      console.error('❌ AuthProvider: Sign up exception:', error);
      setIsLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 AuthProvider: Starting sign out');
      setIsLoading(true);
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ AuthProvider: Sign out error:', error);
      } else {
        console.log('✅ AuthProvider: Sign out successful');
      }
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('❌ AuthProvider: Sign out exception:', error);
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
