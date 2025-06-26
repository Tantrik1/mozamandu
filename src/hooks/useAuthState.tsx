
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
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 AuthState: Starting auth initialization');

    // Set timeout fallback for loading state
    loadingTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('⚠️ AuthState: Loading timeout after 10 seconds, forcing completion');
        setIsLoading(false);
      }
    }, 10000);

    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthState: Getting initial session');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthState: Error getting session:', error);
        } else {
          console.log('✅ AuthState: Initial session retrieved:', session?.user?.email || 'No session');
        }

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('🔄 AuthState: Fetching user profile');
          await fetchUserProfile(session.user.id);
        }
        
      } catch (error) {
        console.error('❌ AuthState: Auth initialization error:', error);
      } finally {
        if (isMounted) {
          console.log('✅ AuthState: Auth initialization complete, setting loading to false');
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔄 AuthState: Auth state changed:', event, session?.user?.email || 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('🔄 AuthState: Fetching user profile after auth change');
          await fetchUserProfile(session.user.id);
        } else {
          clearUserProfile();
        }
        
        // Ensure loading is always set to false after auth state change
        console.log('✅ AuthState: Auth state change complete, setting loading to false');
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      }
    );

    initializeAuth();

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
