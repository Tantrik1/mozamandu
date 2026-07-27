import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

// ── Clients ──────────────────────────────────────────────────
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

// In-memory cache (5 seconds TTL for sub-20ms responses)
const responseCache = new Map();

function getCached(key) {
  const item = responseCache.get(key);
  if (item && Date.now() - item.timestamp < 5000) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  responseCache.set(key, { data, timestamp: Date.now() });
}

function clearCache() {
  responseCache.clear();
}

function normalizeMediaKey(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return rawUrl
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^\/]+/, '')
    .replace(/^\/+/, '');
}

// ── Helper: Batch fetch usage counts by checking image URLs across all database tables ──
async function getAllUsageCounts() {
  const urlQueries = [
    { table: 'products', col: 'image_url' },
    { table: 'categories', col: 'image_url' },
    { table: 'subcategories', col: 'image_url' },
    { table: 'product_color_variants', col: 'image_url' },
    { table: 'product_additional_images', col: 'image_url' },
    { table: 'product_additional_images', col: 'storage_path' },
    { table: 'payment_methods', col: 'qr_code_url' },
    { table: 'notices', col: 'image_url' },
    { table: 'blogs', col: 'image_url' },
    { table: 'site_settings', col: 'value' },
  ];

  const dbKeys = [];
  await Promise.all(urlQueries.map(async ({ table, col }) => {
    try {
      const { data } = await supabase.from(table).select(col).not(col, 'is', null);
      if (data) {
        data.forEach(r => {
          const val = r[col];
          if (val && typeof val === 'string' && val.trim()) {
            const normalized = normalizeMediaKey(val);
            if (normalized) dbKeys.push(normalized);
          }
        });
      }
    } catch (e) {}
  }));

  return dbKeys;
}

// ── Upload to R2 + Register in media_library ─────────────────
app.post(['/api/upload-r2', '/upload-r2'], upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const folder = req.body.folder || 'uploads';
    const title = req.body.title || '';
    const altText = req.body.alt_text || '';
    const timestamp = Date.now();
    const origExt = req.file.originalname ? req.file.originalname.split('.').pop() : 'webp';
    const ext = (origExt && origExt.length <= 4) ? origExt.toLowerCase() : 'webp';
    const key = `${folder}/${folder}-${timestamp}.${ext}`.replace(/\/+/g, '/');

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const publicUrl = `${CDN_BASE}/${key}`;

    const mediaRow = {
      url: publicUrl,
      r2_key: key,
      filename: req.file.originalname || `${folder}-${timestamp}.${ext}`,
      title: title || req.file.originalname?.replace(/\.[^/.]+$/, '') || folder,
      alt_text: altText || `${folder} image`,
      folder,
      mime_type: req.file.mimetype || 'image/webp',
      size_bytes: req.file.size,
      width: 0,
      height: 0,
    };

    const { data: inserted, error: dbErr } = await supabase
      .from('media_library')
      .upsert(mediaRow, { onConflict: 'url' })
      .select('id, url')
      .single();

    if (dbErr) {
      console.warn('[DB WARN] Could not register in media_library:', dbErr.message);
    }

    clearCache();
    console.log(`[R2 UPLOAD] ${req.file.originalname} -> ${publicUrl}`);
    return res.json({
      url: publicUrl,
      media_id: inserted?.id || null,
      r2_key: key,
    });
  } catch (err) {
    console.error('[R2 UPLOAD ERROR]', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ── Ultra-Fast List Media (Batch usage query + in-memory cache) ──
app.get(['/api/media', '/media'], async (req, res) => {
  try {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const { search, folder, limit = '100', offset = '0', unused, _t } = req.query;

    if (!_t) {
      const cacheKey = JSON.stringify({ search, folder, limit, offset, unused });
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    let query = supabase
      .from('media_library')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (folder) query = query.eq('folder', folder);
    if (search) query = query.or(`title.ilike.%${search}%,filename.ilike.%${search}%,alt_text.ilike.%${search}%`);

    const [{ data, error, count }, dbUrls] = await Promise.all([
      query,
      getAllUsageCounts(),
    ]);

    if (error) {
      console.warn('[MEDIA LIST DB WARN]', error.message);
      return res.json({ items: [], total: 0 });
    }

    let items = (data || []).map(item => {
      const itemUrlKey = normalizeMediaKey(item.url);
      const itemR2Key = normalizeMediaKey(item.r2_key);
      const filenameKey = normalizeMediaKey(item.filename);

      let usageCount = 0;
      for (const dbKey of dbKeys) {
        if (!dbKey) continue;
        
        if (
          (itemUrlKey && (dbKey === itemUrlKey || dbKey.includes(itemUrlKey) || itemUrlKey.includes(dbKey))) ||
          (itemR2Key && (dbKey === itemR2Key || dbKey.includes(itemR2Key) || itemR2Key.includes(dbKey))) ||
          (filenameKey && filenameKey.length > 4 && dbKey.endsWith(filenameKey))
        ) {
          usageCount++;
        }
      }

      return {
        ...item,
        usage_count: usageCount,
      };
    });

    if (unused === 'true') {
      items = items.filter(i => i.usage_count === 0);
    }

    const response = { items, total: count || items.length };
    setCache(cacheKey, response);
    return res.json(response);
  } catch (err) {
    console.error('[MEDIA LIST ERROR]', err);
    return res.json({ items: [], total: 0 });
  }
});

// ── Ultra-Fast Media Stats ───────────────────────────────────
app.get(['/api/media/stats', '/media/stats'], async (req, res) => {
  try {
    const cached = getCached('stats');
    if (cached) return res.json(cached);

    const { data: all, error } = await supabase.from('media_library').select('size_bytes, folder');
    if (error || !all) {
      return res.json({
        total_files: 0,
        total_bytes: 0,
        total_mb: 0,
        total_gb: 0,
        limit_gb: 10,
        limit_bytes: 10737418240,
        usage_percent: 0,
        by_folder: [],
      });
    }

    const totalBytes = all.reduce((sum, r) => sum + (r.size_bytes || 0), 0);
    const byFolder = {};
    all.forEach(r => {
      if (!byFolder[r.folder]) byFolder[r.folder] = { folder: r.folder, count: 0, bytes: 0 };
      byFolder[r.folder].count++;
      byFolder[r.folder].bytes += (r.size_bytes || 0);
    });

    const response = {
      total_files: all.length,
      total_bytes: totalBytes,
      total_mb: +(totalBytes / 1048576).toFixed(2),
      total_gb: +(totalBytes / 1073741824).toFixed(3),
      limit_gb: 10,
      limit_bytes: 10737418240,
      usage_percent: +(totalBytes / 10737418240 * 100).toFixed(2),
      by_folder: Object.values(byFolder),
    };

    setCache('stats', response);
    return res.json(response);
  } catch (err) {
    console.error('[MEDIA STATS ERROR]', err);
    return res.json({
      total_files: 0,
      total_bytes: 0,
      total_mb: 0,
      total_gb: 0,
      limit_gb: 10,
      limit_bytes: 10737418240,
      usage_percent: 0,
      by_folder: [],
    });
  }
});

// ── Sync Cloudflare R2 Bucket with media_library table ──────────
app.post(['/api/media/sync', '/media/sync'], async (req, res) => {
  try {
    const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET }));
    const r2Objects = listRes.Contents || [];
    
    const { data: dbItems, error: dbErr } = await supabase.from('media_library').select('*');
    if (dbErr) throw dbErr;

    const dbMap = new Map((dbItems || []).map(item => [item.r2_key, item]));
    let addedCount = 0;
    let updatedCount = 0;

    for (const obj of r2Objects) {
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
        await supabase.from('media_library').insert({
          url: publicUrl,
          r2_key: key,
          filename,
          title,
          alt_text: altText,
          folder,
          mime_type: mimeType,
          size_bytes: obj.Size || 0,
        });
        addedCount++;
      } else if (existing.size_bytes !== obj.Size || existing.url !== publicUrl) {
        await supabase.from('media_library').update({
          size_bytes: obj.Size || 0,
          url: publicUrl,
        }).eq('id', existing.id);
        updatedCount++;
      }
    }

    clearCache();
    console.log(`[R2 SYNC] Total: ${r2Objects.length}, Added: ${addedCount}, Updated: ${updatedCount}`);
    return res.json({
      success: true,
      total_r2_files: r2Objects.length,
      synced_added: addedCount,
      synced_updated: updatedCount,
    });
  } catch (err) {
    console.error('[R2 SYNC ERROR]', err);
    return res.status(500).json({ error: err.message || 'R2 sync failed' });
  }
});

// ── Rename / Move R2 File Key & Sync All Database Links ───────
app.post(['/api/media/:id/rename', '/media/:id/rename'], async (req, res) => {
  try {
    const { id } = req.params;
    const { new_filename, new_folder, title, alt_text } = req.body;

    const { data: media, error: fetchErr } = await supabase
      .from('media_library')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !media) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    const oldKey = media.r2_key;
    const folder = new_folder !== undefined ? new_folder.trim().toLowerCase() : media.folder;
    let filename = new_filename !== undefined ? new_filename.trim() : media.filename;
    
    // Ensure filename extension matches
    const oldExt = oldKey.split('.').pop() || 'webp';
    if (!filename.toLowerCase().endsWith(`.${oldExt.toLowerCase()}`)) {
      filename = `${filename}.${oldExt}`;
    }

    const newKey = `${folder}/${filename}`.replace(/\/+/g, '/');
    const newUrl = `${CDN_BASE}/${newKey}`;

    if (oldKey !== newKey && oldKey) {
      console.log(`[R2 RENAME] Copying ${oldKey} -> ${newKey} in R2...`);
      await s3Client.send(new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${oldKey}`,
        Key: newKey,
      }));

      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: oldKey,
      }));
    }

    const updates = {
      r2_key: newKey,
      url: newUrl,
      filename,
      folder,
    };
    if (title !== undefined) updates.title = title;
    if (alt_text !== undefined) updates.alt_text = alt_text;

    const { data: updatedMedia, error: updateErr } = await supabase
      .from('media_library')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Update all database tables referencing the old URL
    if (media.url !== newUrl) {
      await Promise.all([
        supabase.from('products').update({ image_url: newUrl }).eq('image_url', media.url),
        supabase.from('categories').update({ image_url: newUrl }).eq('image_url', media.url),
        supabase.from('subcategories').update({ image_url: newUrl }).eq('image_url', media.url),
        supabase.from('product_color_variants').update({ image_url: newUrl }).eq('image_url', media.url),
        supabase.from('product_additional_images').update({ image_url: newUrl }).eq('image_url', media.url),
        supabase.from('payment_methods').update({ qr_code_url: newUrl }).eq('qr_code_url', media.url),
        supabase.from('site_settings').update({ value: newUrl }).eq('value', media.url),
      ]);
    }

    clearCache();
    console.log(`[R2 RENAME SUCCESS] ${oldKey} -> ${newKey}`);
    return res.json(updatedMedia);
  } catch (err) {
    console.error('[R2 RENAME ERROR]', err);
    return res.status(500).json({ error: err.message || 'Rename failed' });
  }
});

// ── Update Media Metadata ───────────────────────────────────
app.patch(['/api/media/:id', '/media/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { title, alt_text, folder } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (alt_text !== undefined) updates.alt_text = alt_text;
    if (folder !== undefined) updates.folder = folder;

    const { data, error } = await supabase
      .from('media_library')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    clearCache();
    return res.json(data);
  } catch (err) {
    console.error('[MEDIA UPDATE ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Delete Media ─────────────────────────────────────────────
app.delete(['/api/media/:id', '/media/:id'], async (req, res) => {
  try {
    const { id } = req.params;

    const { data: media, error: fetchErr } = await supabase
      .from('media_library')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const { error: delErr } = await supabase
      .from('media_library')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    if (media.r2_key) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: media.r2_key }));
      } catch (r2Err) {
        console.warn('[R2 DELETE WARN]', r2Err.message);
      }
    }

    clearCache();
    console.log(`[MEDIA DELETED] ${media.url}`);
    return res.json({ success: true, deleted: media.url });
  } catch (err) {
    console.error('[MEDIA DELETE ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Site Settings ────────────────────────────────────────────
app.get(['/api/site-settings', '/site-settings'], async (req, res) => {
  try {
    const cached = getCached('site_settings');
    if (cached) return res.json(cached);

    const { data, error } = await supabase.from('site_settings').select('*');
    if (error || !data) {
      return res.json({});
    }

    const settings = {};
    data.forEach(row => {
      settings[row.key] = {
        id: row.id,
        value: row.value,
        media_id: row.media_id,
        metadata: row.metadata,
        updated_at: row.updated_at,
      };
    });

    setCache('site_settings', settings);
    return res.json(settings);
  } catch (err) {
    console.error('[SITE SETTINGS ERROR]', err);
    return res.json({});
  }
});

app.put(['/api/site-settings/:key', '/site-settings/:key'], async (req, res) => {
  try {
    const { key } = req.params;
    const { value, media_id, metadata } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (value !== undefined) updates.value = value;
    if (media_id !== undefined) updates.media_id = media_id;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data, error } = await supabase
      .from('site_settings')
      .upsert({ key, ...updates }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;
    clearCache();
    return res.json(data);
  } catch (err) {
    console.error('[SITE SETTINGS UPDATE ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Health ───────────────────────────────────────────────────
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Event Loop Keep-Alive (Prevents process exit) ────────────
setInterval(() => {}, 60000);

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ultra-Fast R2 Media Server listening on port ${PORT}`);
});
