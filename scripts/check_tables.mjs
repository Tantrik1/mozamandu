import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk';

const supabase = createClient(supabaseUrl, serviceKey);

async function listTables() {
  const tables = ['blog_posts', 'blogs', 'posts', 'articles', 'product_faqs', 'products', 'categories', 'subcategories', 'site_settings', 'media_library'];
  for (const t of tables) {
    const { error, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table '${t}':`, error ? error.message : `Exists (${count} rows)`);
  }
}

listTables().catch(console.error);
