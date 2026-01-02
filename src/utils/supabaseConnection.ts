import { supabase } from "@/integrations/supabase/client";

// External Supabase project details
const EXPECTED_SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const EXPECTED_PROJECT_ID = 'huwhbxjlyucamitwwhyg';

/**
 * Verifies connection to the external Supabase project
 * Call this on app startup to confirm the correct database is connected
 */
export async function verifySupabaseConnection(): Promise<{
  connected: boolean;
  projectId: string;
  isCorrectProject: boolean;
  error?: string;
}> {
  try {
    // Extract project ID from the Supabase client URL
    // @ts-ignore - accessing internal supabase URL
    const supabaseUrl = supabase.supabaseUrl || '';
    const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    const actualProjectId = projectIdMatch ? projectIdMatch[1] : 'unknown';
    
    // Test connection with a simple query
    const { error } = await supabase.from('categories').select('id').limit(1);
    
    const connected = !error;
    const isCorrectProject = actualProjectId === EXPECTED_PROJECT_ID;
    
    // Log connection status
    console.log('🔗 Supabase Connection Check:', {
      connected,
      projectId: actualProjectId,
      expectedProjectId: EXPECTED_PROJECT_ID,
      isCorrectProject,
      url: supabaseUrl,
    });
    
    if (!isCorrectProject) {
      console.warn('⚠️ WARNING: Connected to unexpected Supabase project!');
      console.warn(`  Expected: ${EXPECTED_PROJECT_ID}`);
      console.warn(`  Actual: ${actualProjectId}`);
    }
    
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

/**
 * Gets the expected Supabase project URL
 */
export function getExpectedSupabaseUrl(): string {
  return EXPECTED_SUPABASE_URL;
}

/**
 * Gets the expected Supabase project ID
 */
export function getExpectedProjectId(): string {
  return EXPECTED_PROJECT_ID;
}
