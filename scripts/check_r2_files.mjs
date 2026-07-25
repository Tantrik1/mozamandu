import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://ab94ca7fe2714291ff48ec76111769e3.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '66ba4e715f5e7643bcf8dd8fa71786bc',
    secretAccessKey: 'c1d63b6161fb6e8fdc011098eadf75c4a33e0a7d4cd18b7e1bd548a8a6b5f313',
  },
});

const BUCKET = 'mozamandu';
const CDN_BASE = 'https://images.mozamandu.com';

const supabase = createClient(
  'https://huwhbxjlyucamitwwhyg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk'
);

async function listR2AndSync() {
  console.log('Listing all R2 bucket objects...');
  const res = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET }));
  const objects = res.Contents || [];
  console.log(`Found ${objects.length} objects in Cloudflare R2:`);
  for (const obj of objects) {
    console.log(` - ${obj.Key} (${obj.Size} bytes)`);
  }

  // Also check database media_library
  const { data: dbItems } = await supabase.from('media_library').select('r2_key, url');
  console.log(`Database media_library has ${dbItems?.length || 0} items.`);
}

listR2AndSync().catch(console.error);
