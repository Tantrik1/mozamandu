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

async function syncR2ToMediaLibrary() {
  console.log('Fetching objects from Cloudflare R2 bucket...');
  const res = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET }));
  const objects = res.Contents || [];
  console.log(`Found ${objects.length} R2 objects.`);

  const { data: dbItems } = await supabase.from('media_library').select('*');
  const dbMap = new Map((dbItems || []).map(item => [item.r2_key, item]));

  for (const obj of objects) {
    const key = obj.Key;
    if (!key) continue;
    const parts = key.split('/');
    const folder = parts.length > 1 ? parts[0] : 'uploads';
    const filename = parts[parts.length - 1];
    const publicUrl = `${CDN_BASE}/${key}`;
    const title = filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
    const altText = title;
    const ext = filename.split('.').pop()?.toLowerCase() || 'webp';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/webp';

    const existing = dbMap.get(key);
    if (!existing) {
      console.log(`Adding missing R2 file to DB: ${key}`);
      const { error } = await supabase.from('media_library').insert({
        url: publicUrl,
        r2_key: key,
        filename,
        title,
        alt_text: altText,
        folder,
        mime_type: mimeType,
        size_bytes: obj.Size || 0,
      });
      if (error) console.error('Insert error:', error);
    } else {
      console.log(`Already in DB: ${key}`);
    }
  }
  console.log('R2 Sync complete.');
}

syncR2ToMediaLibrary().catch(console.error);
