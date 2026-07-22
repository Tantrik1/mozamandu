#!/usr/bin/env python3
"""Full migration: Supabase Storage → Cloudflare R2 (WebP)
Uses service_role key to bypass RLS policies.
"""

import requests
import boto3
import io
import json
from PIL import Image

SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk'

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

s3 = boto3.client(
    's3',
    endpoint_url='https://ab94ca7fe2714291ff48ec76111769e3.r2.cloudflarestorage.com',
    aws_access_key_id='66ba4e715f5e7643bcf8dd8fa71786bc',
    aws_secret_access_key='c1d63b6161fb6e8fdc011098eadf75c4a33e0a7d4cd18b7e1bd548a8a6b5f313',
    region_name='auto'
)
CDN_BASE = 'https://images.mozamandu.com'
BUCKET = 'mozamandu'


def download_and_compress(url):
    """Download image and compress to WebP."""
    try:
        res = requests.get(url, timeout=20)
        if res.status_code != 200:
            print(f"  ⚠ Failed to download (HTTP {res.status_code}): {url}")
            return None
        img = Image.open(io.BytesIO(res.content)).convert('RGB')
        out = io.BytesIO()
        img.save(out, format='WEBP', quality=85, optimize=True)
        return out.getvalue()
    except Exception as e:
        print(f"  ⚠ Error processing {url}: {e}")
        return None


def upload_to_r2(data, r2_key):
    """Upload bytes to Cloudflare R2."""
    s3.put_object(
        Bucket=BUCKET,
        Key=r2_key,
        Body=data,
        ContentType='image/webp',
        CacheControl='public, max-age=31536000, immutable'
    )
    return f'{CDN_BASE}/{r2_key}'


def url_to_r2_key(folder, url):
    """Generate R2 key from folder and URL."""
    fname = url.split('/')[-1].split('?')[0]
    base = fname.rsplit('.', 1)[0] if '.' in fname else fname
    return f'{folder}/{base}.webp'


def patch_row(table, row_id, payload):
    """Update a single row in Supabase using service role key."""
    res = requests.patch(
        f'{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}',
        headers=HEADERS,
        json=payload
    )
    return res.status_code


def migrate_single_col(table, col='image_url'):
    """Migrate a single image_url column in a table."""
    print(f"\n=== Migrating {table}.{col} ===")
    res = requests.get(
        f'{SUPABASE_URL}/rest/v1/{table}?select=id,{col}',
        headers=HEADERS
    )
    if res.status_code != 200:
        print(f"  ⚠ Could not fetch {table}: HTTP {res.status_code} - {res.text}")
        return
    rows = [r for r in res.json() if r.get(col) and 'supabase.co' in str(r.get(col))]
    print(f"  Found {len(rows)} rows with Supabase URLs to migrate")
    ok = 0
    for r in rows:
        url = r[col]
        r2_key = url_to_r2_key(table, url)
        data = download_and_compress(url)
        if data:
            new_url = upload_to_r2(data, r2_key)
            status = patch_row(table, r['id'], {col: new_url})
            if status in (200, 204):
                ok += 1
                print(f"  ✓ [{ok}/{len(rows)}] {r['id']} -> {new_url}")
            else:
                print(f"  ✗ Patch failed for {r['id']} (HTTP {status})")
    print(f"  Done: {ok}/{len(rows)} migrated for {table}.{col}")


def migrate_products_images_array():
    """Migrate products.images JSON array field."""
    print(f"\n=== Migrating products.images (JSON array) ===")
    # Use select=* to see all columns
    res = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=*',
        headers=HEADERS
    )
    if res.status_code != 200:
        print(f"  ⚠ Could not fetch products: HTTP {res.status_code} - {res.text[:200]}")
        return
    rows = res.json()
    # Find column names from first row
    if rows:
        print(f"  Product columns: {list(rows[0].keys())}")

    ok = 0
    for r in rows:
        imgs = r.get('images')
        if not imgs or not isinstance(imgs, list):
            continue
        supa_urls = [u for u in imgs if isinstance(u, str) and 'supabase.co' in u]
        if not supa_urls:
            continue
        print(f"  Product {r['id']}: {len(supa_urls)} gallery images to migrate")
        new_imgs = []
        for url in imgs:
            if isinstance(url, str) and 'supabase.co' in url:
                r2_key = url_to_r2_key('products/gallery', url)
                data = download_and_compress(url)
                if data:
                    new_url = upload_to_r2(data, r2_key)
                    new_imgs.append(new_url)
                    print(f"    ✓ -> {new_url}")
                else:
                    new_imgs.append(url)
            else:
                new_imgs.append(url)
        status = patch_row(r['id'], 'products', {'images': new_imgs})
        # Note: correct call order
        res2 = requests.patch(
            f'{SUPABASE_URL}/rest/v1/products?id=eq.{r["id"]}',
            headers=HEADERS,
            json={'images': new_imgs}
        )
        if res2.status_code in (200, 204):
            ok += 1
        else:
            print(f"    ✗ Patch images array failed (HTTP {res2.status_code})")
    print(f"  Done: {ok} products' image arrays migrated")


def check_remaining():
    """Print final counts of Supabase vs R2 URLs."""
    print("\n" + "="*60)
    print("FINAL MIGRATION STATUS")
    print("="*60)
    tables = [
        ('color_variants', 'image_url'),
        ('product_additional_images', 'image_url'),
        ('product_variants', 'image_url'),
        ('products', 'image_url'),
        ('categories', 'image_url'),
        ('subcategories', 'image_url'),
        ('payment_methods', 'qr_code_url'),
    ]
    all_good = True
    for t, col in tables:
        res = requests.get(
            f'{SUPABASE_URL}/rest/v1/{t}?select=id,{col}',
            headers=HEADERS
        )
        if res.status_code == 200:
            rows = res.json()
            supa = [r for r in rows if r.get(col) and 'supabase.co' in str(r.get(col))]
            r2 = [r for r in rows if r.get(col) and 'images.mozamandu.com' in str(r.get(col))]
            null_count = len([r for r in rows if not r.get(col)])
            status_icon = "✓" if len(supa) == 0 else "✗"
            print(f"  {status_icon} {t:30s}: {len(r2):3d} on R2 | {len(supa):3d} on Supabase | {null_count} NULL (Total: {len(rows)})")
            if len(supa) > 0:
                all_good = False
                for r in supa[:3]:
                    print(f"      Still on Supabase: {r.get(col, '')[:80]}")
    print()
    if all_good:
        print("🎉 ALL image URLs migrated to Cloudflare R2!")
    else:
        print("⚠  Some images still on Supabase - check errors above")


if __name__ == '__main__':
    print("Starting full migration with service_role key (bypasses RLS)...")
    print(f"Supabase: {SUPABASE_URL}")
    print(f"CDN: {CDN_BASE}")
    print()

    # Verify service role key works
    test = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id&limit=1', headers=HEADERS)
    print(f"Auth test (products): HTTP {test.status_code}")
    if test.status_code != 200:
        print(f"ERROR: Cannot authenticate! Response: {test.text}")
        exit(1)

    # Migrate all tables with single image column
    migrate_single_col('color_variants', 'image_url')
    migrate_single_col('product_additional_images', 'image_url')
    migrate_single_col('product_variants', 'image_url')
    migrate_single_col('products', 'image_url')
    migrate_single_col('categories', 'image_url')
    migrate_single_col('subcategories', 'image_url')
    migrate_single_col('payment_methods', 'qr_code_url')

    # Migrate products.images JSON array
    migrate_products_images_array()

    # Final status
    check_remaining()
