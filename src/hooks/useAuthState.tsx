
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile, fetchUserProfile, clearUserProfile } = useUserProfile();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    console.log('🔄 AuthState: Initializing auth state');

    // Set loading timeout - if auth doesn't resolve in 3 seconds, stop loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.log('⏰ AuthState: Loading timeout - setting loading to false');
        setIsLoading(false);
      }
    }, 3000);

    // Get initial session first
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthState: Error getting session:', error);
        } else {
          console.log('✅ AuthState: Initial session:', session?.user?.email || 'No session');
        }

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        } else {
          clearUserProfile();
        }
        
        // Clear loading timeout and set loading to false
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ AuthState: Session initialization error:', error);
        if (isMounted) {
          clearTimeout(loadingTimeout);
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        console.log('🔄 AuthState: Auth state changed:', event, session?.user?.email || 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        } else {
          clearUserProfile();
        }
        
        // Ensure loading stops after auth state change
        setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        }, 100);
      }
    );

    // Get initial session
    getInitialSession();

    return () => {
      console.log('🧹 AuthState: Cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, clearUserProfile]);

  return {
    user,
    session,
    userProfile,
    isLoading
  };
}
