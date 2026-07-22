import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from Environment Variables (12-Factor pattern for seamless Prod promotion)
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://rgfwekuceitxmturaiqn.supabase.co';

const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_XowcCTKSnc1qLymzxMEQqg_7GRQGzAH';

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