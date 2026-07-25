import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://huwhbxjlyucamitwwhyg.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk';

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase.from('media_library').select('*');
  console.log('Error:', error);
  console.log('Count:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('Sample item:', data[0]);
  }

  // Also check products, categories, subcategories, etc. for image URLs
  const { data: prods } = await supabase.from('products').select('id, name, image_url');
  console.log('Products with image_url:', prods?.map(p => ({ id: p.id, name: p.name, image: p.image_url })));
}

check().catch(console.error);
