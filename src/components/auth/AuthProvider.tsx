
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

    console.log('🔄 AuthProvider: Starting auth initialization');

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthProvider: Error getting session:', error);
        } else {
          console.log('✅ AuthProvider: Initial session retrieved:', session?.user?.email || 'No session');
        }

        if (!isMounted) return;

        // Only set session if user email is confirmed
        if (session?.user?.email_confirmed_at) {
          setSession(session);
          setUser(session.user);
          
          // Fetch user profile
          const profile = await authService.fetchUserProfile(session.user.id);
          if (isMounted) {
            setUserProfile(profile);
          }
        } else {
          // Clear any invalid session
          setSession(null);
          setUser(null);
          setUserProfile(null);
          if (session) {
            console.log('🔄 AuthProvider: Clearing unconfirmed session');
            await supabase.auth.signOut();
          }
        }
        
      } catch (error) {
        console.error('❌ AuthProvider: Auth initialization error:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setUserProfile(null);
        }
      } finally {
        if (isMounted) {
          console.log('✅ AuthProvider: Auth initialization complete');
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔄 AuthProvider: Auth state changed:', event, session?.user?.email || 'No session');
        
        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Only proceed if email is confirmed
          if (session?.user?.email_confirmed_at) {
            setSession(session);
            setUser(session.user);
            
            // Fetch user profile asynchronously
            setTimeout(async () => {
              if (isMounted) {
                const profile = await authService.fetchUserProfile(session.user.id);
                if (isMounted) {
                  setUserProfile(profile);
                }
              }
            }, 0);
          } else {
            console.warn('⚠️ AuthProvider: User email not confirmed');
            setSession(null);
            setUser(null);
            setUserProfile(null);
            if (session) {
              await supabase.auth.signOut();
            }
          }
        }
        
        setIsLoading(false);
      }
    );

    initializeAuth();

    return () => {
      console.log('🧹 AuthProvider: Cleanup');
      isMounted = false;
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
    
    // Clear local state immediately
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
