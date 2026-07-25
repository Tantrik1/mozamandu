import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkBlogs() {
  const { data, error } = await supabase.from('blogs').select('*');
  console.log('Error:', error);
  if (data && data.length > 0) {
    console.log('Columns in blogs:', Object.keys(data[0]));
    console.log('Sample blog post 0:', data[0]);
  }
}

checkBlogs().catch(console.error);
