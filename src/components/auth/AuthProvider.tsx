
import { useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
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
          const profile = await authService.fetchUserProfile(session.user.id);
          if (isMounted) {
            setUserProfile(profile);
          }
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
          
          const profile = await authService.fetchUserProfile(session.user.id);
          if (isMounted) {
            setUserProfile(profile);
          }
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

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await authService.signIn(email, password);
    setIsLoading(false);
    return result;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    const result = await authService.signUp(email, password, fullName);
    setIsLoading(false);
    return result;
  };

  const signOut = async () => {
    setIsLoading(true);
    
    // Clear local state first
    setUser(null);
    setSession(null);
    setUserProfile(null);
    
    await authService.signOut();
    setIsLoading(false);
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
