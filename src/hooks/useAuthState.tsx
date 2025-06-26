
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

    console.log('🔄 AuthState: Initializing auth state');

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔄 AuthState: Auth state changed:', event, session?.user?.email || 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            if (isMounted) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        } else {
          clearUserProfile();
        }
        
        setIsLoading(false);
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthState: Error getting session:', error);
        } else {
          console.log('✅ AuthState: Initial session:', session?.user?.email || 'No session');
        }

        if (!isMounted) return;

        // Only set state if we don't already have a session from the listener
        if (!user && !session) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        } else if (session?.user) {
          // Fetch profile for initial session
          setTimeout(() => {
            if (isMounted) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        }
      } catch (error) {
        console.error('❌ AuthState: Session initialization error:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      console.log('🧹 AuthState: Cleanup');
      isMounted = false;
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
