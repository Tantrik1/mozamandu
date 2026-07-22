import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Default Development Supabase Credentials
const DEV_SUPABASE_URL = 'https://rgfwekuceitxmturaiqn.supabase.co';
const DEV_SUPABASE_KEY = 'sb_publishable_XowcCTKSnc1qLymzxMEQqg_7GRQGzAH';

// Production Supabase Credentials
const PROD_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const PROD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg4NTcsImV4cCI6MjA2NjIzNDg1N30.C3n_x6n_hY06aC2H_nK7F6WbK6S0H9O_G9S8T7U6V5W';

const isDemoHost = typeof window !== 'undefined' && window.location.hostname.includes('demo');

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || (isDemoHost ? DEV_SUPABASE_URL : PROD_SUPABASE_URL);
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || (isDemoHost ? DEV_SUPABASE_KEY : PROD_SUPABASE_KEY);

console.log(`[SUPABASE CLIENT] Connecting to ${SUPABASE_URL} (${isDemoHost ? 'Development' : 'Production'} environment)`);

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);