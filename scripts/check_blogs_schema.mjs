import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkSchema() {
  const { data, error } = await supabase.from('blog_posts').select('*').limit(1);
  if (error) {
    console.error('Error fetching blog_posts:', error);
  } else {
    console.log('Existing blog_posts columns:', Object.keys(data[0] || {}));
    console.log('Sample blog post:', data[0]);
  }
}

checkSchema().catch(console.error);
