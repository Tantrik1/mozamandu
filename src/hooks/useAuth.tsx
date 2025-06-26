
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
      (event, session) => {
        if (!isMounted) return;

        console.log('🔄 AuthProvider: Auth state changed:', event, session?.user?.email || 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
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
    let isMounted = true;
    
    try {
      console.log('🔄 AuthProvider: Fetching user profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ AuthProvider: Error fetching user profile:', error);
        // Check if it's an RLS issue
        if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
          console.warn('⚠️ AuthProvider: RLS may be blocking profile access');
        }
        return;
      }

      if (!isMounted) return;

      console.log('✅ AuthProvider: User profile fetched:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('❌ AuthProvider: Profile fetch error:', error);
    }
    
    return () => {
      isMounted = false;
    };
  };

  const signIn = async (email: string, password: string) => {
    let isMounted = true;
    
    try {
      console.log('🔄 AuthProvider: Starting sign in');
      setIsLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (!isMounted) return { error };
      
      if (error) {
        console.error('❌ AuthProvider: Sign in error:', error);
        setIsLoading(false);
        return { error };
      }
      
      console.log('✅ AuthProvider: Sign in successful');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      return { error: null };
    } catch (error) {
      console.error('❌ AuthProvider: Sign in exception:', error);
      if (isMounted) {
        setIsLoading(false);
      }
      return { error };
    }
    
    return () => {
      isMounted = false;
    };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    let isMounted = true;
    
    try {
      console.log('🔄 AuthProvider: Starting sign up');
      setIsLoading(true);
      
      const { error } = await supabase.auth.signUp({
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

      if (!isMounted) return { error };

      if (error) {
        console.error('❌ AuthProvider: Sign up error:', error);
        setIsLoading(false);
        return { error };
      }

      console.log('✅ AuthProvider: Sign up successful');
      setIsLoading(false);
      return { error: null };
    } catch (error) {
      console.error('❌ AuthProvider: Sign up exception:', error);
      if (isMounted) {
        setIsLoading(false);
      }
      return { error };
    }
    
    return () => {
      isMounted = false;
    };
  };

  const signOut = async () => {
    let isMounted = true;
    
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
      
      // Force redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('❌ AuthProvider: Sign out exception:', error);
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
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
