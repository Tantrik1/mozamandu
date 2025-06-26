
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<any>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('🔄 UserProfile: Fetching user profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ UserProfile: Error fetching user profile:', error);
        // Check if it's an RLS issue
        if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
          console.warn('⚠️ UserProfile: RLS may be blocking profile access');
        }
        return;
      }

      console.log('✅ UserProfile: User profile fetched:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('❌ UserProfile: Profile fetch error:', error);
    }
  }, []);

  const clearUserProfile = useCallback(() => {
    setUserProfile(null);
  }, []);

  return {
    userProfile,
    fetchUserProfile,
    clearUserProfile
  };
}
