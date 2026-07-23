import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const EXTERNAL_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';
export const EXTERNAL_SUPABASE_PROJECT_ID = 'huwhbxjlyucamitwwhyg';
export const EXTERNAL_SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg4NTcsImV4cCI6MjA2NjIzNDg1N30.cB3YipySfkizYpvwUPd9xlBlq_haPznmEpPgcbAwovQ';

export const supabase = createClient<Database>(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY
);