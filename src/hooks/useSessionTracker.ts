import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSessionTracker() {
  useEffect(() => {
    async function trackSession() {
      try {
        const SESSION_KEY = 'mozamandu_session_id';
        let sessionId = sessionStorage.getItem(SESSION_KEY);

        if (!sessionId) {
          sessionId = crypto.randomUUID();
          sessionStorage.setItem(SESSION_KEY, sessionId);

          // Insert session into site_sessions table
          await supabase.from('site_sessions' as any).insert([
            { session_id: sessionId, created_at: new Date().toISOString() }
          ]);
        }
      } catch (err) {
        // Silent fail if table not present yet
      }
    }

    trackSession();
  }, []);
}
