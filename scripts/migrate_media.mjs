import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk';

const supabase = createClient(supabaseUrl, serviceKey);

async function migrate() {
  // Create media_library table via SQL
  const { error: err1 } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS media_library (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        url text UNIQUE NOT NULL,
        r2_key text NOT NULL,
        filename text NOT NULL DEFAULT '',
        title text NOT NULL DEFAULT '',
        alt_text text NOT NULL DEFAULT '',
        folder text NOT NULL DEFAULT 'uploads',
        mime_type text NOT NULL DEFAULT 'image/webp',
        size_bytes bigint NOT NULL DEFAULT 0,
        width int DEFAULT 0,
        height int DEFAULT 0,
        used_in jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now()
      );
    `
  });
  console.log('media_library table:', err1 ? err1.message : 'OK');

  // Create site_settings table
  const { error: err2 } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS site_settings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        key text UNIQUE NOT NULL,
        value text NOT NULL DEFAULT '',
        metadata jsonb DEFAULT '{}'::jsonb,
        updated_at timestamptz DEFAULT now()
      );
    `
  });
  console.log('site_settings table:', err2 ? err2.message : 'OK');

  // Try direct inserts into site_settings via REST
  const { error: err3 } = await supabase.from('site_settings').upsert([
    { key: 'hero_background', value: 'https://images.mozamandu.com/hero-background.webp', metadata: { alt_text: 'Mozamandu Premium Socks Collection', title: 'Hero Background' } },
    { key: 'logo_header', value: '/lovable-uploads/c5be09dc-3446-4e71-9d5a-482531992782.jpg', metadata: { alt_text: 'Mozamandu Logo', title: 'Header Logo' } },
    { key: 'logo_footer', value: '/lovable-uploads/84f1077a-8761-4272-88fd-ec35838bbd2b.png', metadata: { alt_text: 'Mozamandu Logo', title: 'Footer Logo' } },
    { key: 'favicon', value: '/lovable-uploads/84f1077a-8761-4272-88fd-ec35838bbd2b.png', metadata: { alt_text: 'Mozamandu Favicon', title: 'Favicon' } },
  ], { onConflict: 'key' });
  console.log('site_settings seed:', err3 ? err3.message : 'OK');
}

migrate().catch(console.error);
