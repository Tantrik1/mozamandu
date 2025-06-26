
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

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ AuthState: Session initialization error:', error);
        if (isMounted) {
          setIsLoading(false);
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
          await fetchUserProfile(session.user.id);
        } else {
          clearUserProfile();
        }
        
        setIsLoading(false);
      }
    );

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
