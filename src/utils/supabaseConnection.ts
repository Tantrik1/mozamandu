import { supabase } from "@/integrations/supabase/client";
import { EXTERNAL_SUPABASE_PROJECT_ID, EXTERNAL_SUPABASE_URL } from "@/integrations/supabase/externalClient";

const EXPECTED_SUPABASE_URL = EXTERNAL_SUPABASE_URL;
const EXPECTED_PROJECT_ID = EXTERNAL_SUPABASE_PROJECT_ID;

/**
 * Verifies connection to the external Supabase project
 */
export async function verifySupabaseConnection(): Promise<{
  connected: boolean;
  projectId: string;
  isCorrectProject: boolean;
  error?: string;
}> {
  try {
    // @ts-ignore - accessing internal supabase URL
    const supabaseUrl = supabase.supabaseUrl || '';
    const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    const actualProjectId = projectIdMatch ? projectIdMatch[1] : 'unknown';
    
    // Test connection with a simple query
    const { error } = await supabase.from('categories').select('id').limit(1);
    
    const connected = !error;
    const isCorrectProject = actualProjectId === EXPECTED_PROJECT_ID;
    
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connection verified successfully');
    }
    
    return {
      connected,
      projectId: actualProjectId,
      isCorrectProject,
      error: error?.message,
    };
  } catch (err) {
    console.error('❌ Failed to verify Supabase connection:', err);
    return {
      connected: false,
      projectId: 'unknown',
      isCorrectProject: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export function getExpectedSupabaseUrl(): string {
  return EXPECTED_SUPABASE_URL;
}

export function getExpectedProjectId(): string {
  return EXPECTED_PROJECT_ID;
}
