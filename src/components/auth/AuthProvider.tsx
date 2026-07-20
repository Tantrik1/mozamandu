import { useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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

    // Get initial session and profile before setting loading to false
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user?.email_confirmed_at) {
          setSession(session);
          setUser(session.user);
          // Wait for profile before setting loading to false
          const profile = await authService.fetchUserProfile(session.user.id);
          if (isMounted) setUserProfile(profile);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          return;
        }

        if (session?.user?.email_confirmed_at) {
          setSession(session);
          setUser(session.user);
          // Fetch profile in background
          setTimeout(() => {
            if (isMounted) {
              authService.fetchUserProfile(session.user.id).then(profile => {
                if (isMounted) setUserProfile(profile);
              });
            }
          }, 0);
        } else if (!session) {
          setSession(null);
          setUser(null);
          setUserProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return authService.signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    return authService.signUp(email, password, fullName);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return authService.signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    setUserProfile(null);
    await authService.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userProfile,
      isLoading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
