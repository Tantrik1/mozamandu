#!/usr/bin/env python3
"""
Migrate base64 data URIs in products.image_url → Cloudflare R2 + update DB.

Steps for each affected product:
  1. Fetch the row's image_url (single row, service_role key for longer timeout)
  2. Decode base64 → raw bytes
  3. Upload to R2 as WebP (with Pillow conversion)
  4. PATCH the row's image_url to the R2 CDN URL
"""

import requests
import boto3
import io
import base64
import re
import sys
import time

SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk'

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}

# R2 configuration (from existing scripts)
s3 = boto3.client(
    's3',
    endpoint_url='https://ab94ca7fe2714291ff48ec76111769e3.r2.cloudflarestorage.com',
    aws_access_key_id='66ba4e715f5e7643bcf8dd8fa71786bc',
    aws_secret_access_key='c1d63b6161fb6e8fdc011098eadf75c4a33e0a7d4cd18b7e1bd548a8a6b5f313',
    region_name='auto'
)
BUCKET = 'mozamandu'
CDN_BASE = 'https://images.mozamandu.com'

# The 4 affected product IDs (from diagnostic)
AFFECTED_PRODUCTS = [
    ('29f441cc-55fa-40cd-a788-1ce57c906911', 'Adidas Ankle Box Socks'),
    ('1bb1d7b7-9ae3-4864-bcee-9f750bb0e23e', 'Nike Ankle Box Socks'),
    ('4ee0640b-6071-4fea-b7df-1f3e1f8e3aaa', 'Calvin Klein Sporty Boxer (4pc)'),
    ('69827f09-4d38-4e0f-814f-807a395016dd', 'Supreme Cotton Boxer (4pc)'),
]


def decode_base64_data_uri(data_uri: str) -> tuple:
    """
    Parse a data URI like 'data:image/png;base64,iVBOR...' into (mime_type, raw_bytes).
    """
    match = re.match(r'^data:([^;]+);base64,(.+)$', data_uri, re.DOTALL)
    if match:
        mime_type = match.group(1)
        b64_data = match.group(2)
        raw_bytes = base64.b64decode(b64_data)
        return mime_type, raw_bytes
    
    # Fallback: might just be raw base64 without the data: prefix
    try:
        raw_bytes = base64.b64decode(data_uri)
        return 'image/png', raw_bytes
    except Exception:
        return None, None


def upload_to_r2(image_bytes: bytes, key: str, content_type: str = 'image/webp') -> str:
    """Upload raw bytes to R2 and return the CDN URL."""
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=image_bytes,
        ContentType=content_type,
        CacheControl='public, max-age=31536000, immutable',
    )
    return f'{CDN_BASE}/{key}'


def convert_to_webp(image_bytes: bytes) -> bytes:
    """Convert image bytes to WebP format using Pillow."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGBA')
        else:
            img = img.convert('RGB')
        out = io.BytesIO()
        img.save(out, format='WEBP', quality=85, optimize=True)
        return out.getvalue()
    except ImportError:
        print("  ⚠ Pillow not installed, uploading original format")
        return image_bytes
    except Exception as e:
        print(f"  ⚠ WebP conversion failed ({e}), uploading original format")
        return image_bytes


def patch_product(product_id: str, payload: dict) -> bool:
    """Update a product row via PostgREST."""
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}',
        headers={**HEADERS, 'Prefer': 'return=minimal'},
        json=payload,
        timeout=30,
    )
    return r.status_code in (200, 204)


def fetch_product_image_url(product_id: str) -> str | None:
    """
    Fetch a single product's image_url. 
    Uses service_role key which has a longer statement_timeout (60s vs 3s for anon).
    """
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}&select=image_url',
        headers=HEADERS,
        timeout=120,  # Long HTTP timeout since the data is huge
    )
    if r.status_code in (200, 206):
        rows = r.json()
        if rows:
            return rows[0].get('image_url')
    else:
        print(f"  ⚠ Failed to fetch image_url for {product_id}: HTTP {r.status_code}")
        print(f"    Response: {r.text[:300]}")
    return None


def migrate_product(product_id: str, product_name: str) -> bool:
    """Migrate one product's base64 image_url to R2."""
    print(f"\n{'─' * 60}")
    print(f"Processing: {product_name} ({product_id})")
    print(f"{'─' * 60}")
    
    # Step 1: Fetch the base64 data
    print("  [1/4] Fetching base64 image_url from DB...")
    start = time.time()
    data_uri = fetch_product_image_url(product_id)
    elapsed = time.time() - start
    
    if not data_uri:
        print(f"  ✗ No image_url data returned (took {elapsed:.1f}s)")
        return False
    
    print(f"  ✓ Got {len(data_uri):,} chars in {elapsed:.1f}s")
    
    # Verify it's actually base64
    if not data_uri.startswith('data:') and not len(data_uri) > 1000:
        print(f"  ✓ Already a URL, skipping: {data_uri[:80]}")
        return True
    
    # Step 2: Decode base64
    print("  [2/4] Decoding base64...")
    mime_type, raw_bytes = decode_base64_data_uri(data_uri)
    if raw_bytes is None:
        print(f"  ✗ Failed to decode base64")
        return False
    print(f"  ✓ Decoded: {len(raw_bytes):,} bytes, type: {mime_type}")
    
    # Step 3: Convert to WebP and upload to R2
    print("  [3/4] Converting to WebP and uploading to R2...")
    webp_bytes = convert_to_webp(raw_bytes)
    
    # Generate a clean filename from the product name
    safe_name = re.sub(r'[^a-zA-Z0-9\-]', '-', product_name.lower()).strip('-')
    safe_name = re.sub(r'-+', '-', safe_name)
    timestamp = int(time.time())
    r2_key = f'products/products-{safe_name}-{timestamp}.webp'
    
    try:
        cdn_url = upload_to_r2(webp_bytes, r2_key, 'image/webp')
        print(f"  ✓ Uploaded to R2: {cdn_url}")
        print(f"    Size reduction: {len(raw_bytes):,} → {len(webp_bytes):,} bytes "
              f"({len(webp_bytes)/len(raw_bytes)*100:.0f}%)")
    except Exception as e:
        print(f"  ✗ R2 upload failed: {e}")
        return False
    
    # Step 4: Update DB
    print("  [4/4] Updating database...")
    if patch_product(product_id, {'image_url': cdn_url}):
        print(f"  ✓ Database updated!")
        return True
    else:
        print(f"  ✗ Database update failed")
        return False


def verify_fix():
    """Verify all products now have normal URLs (not base64)."""
    print(f"\n{'=' * 60}")
    print("VERIFICATION")
    print(f"{'=' * 60}")
    
    # Try to fetch all products with basic columns + image_url
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id,name,image_url',
        headers=HEADERS,
        timeout=30,
    )
    
    if r.status_code in (200, 206):
        products = r.json()
        print(f"✓ Products query returned HTTP {r.status_code} (was timing out before!)")
        all_ok = True
        for p in products:
            img = p.get('image_url', '')
            if img and img.startswith('data:'):
                print(f"  ✗ {p['name']} still has base64!")
                all_ok = False
            elif img and img.startswith('http'):
                print(f"  ✓ {p['name']}: {img[:80]}")
            else:
                print(f"  - {p['name']}: NULL/empty")
        
        if all_ok:
            print(f"\n🎉 ALL PRODUCTS FIXED! No more base64 data URIs.")
        return all_ok
    else:
        print(f"✗ Products query still failing: HTTP {r.status_code}")
        print(f"  {r.text[:300]}")
        return False


if __name__ == '__main__':
    print("=" * 60)
    print("BASE64 → R2 MIGRATION")
    print("=" * 60)
    print(f"Supabase: {SUPABASE_URL}")
    print(f"CDN: {CDN_BASE}")
    print(f"Products to migrate: {len(AFFECTED_PRODUCTS)}")
    
    # Verify auth
    r = requests.get(f'{SUPABASE_URL}/rest/v1/products?select=id&limit=1', headers=HEADERS, timeout=10)
    print(f"Auth check: HTTP {r.status_code}")
    if r.status_code not in (200, 206):
        print(f"ERROR: Auth failed! {r.text}")
        sys.exit(1)
    
    # Migrate each product
    results = []
    for pid, pname in AFFECTED_PRODUCTS:
        ok = migrate_product(pid, pname)
        results.append((pname, ok))
    
    # Summary
    print(f"\n{'=' * 60}")
    print("MIGRATION RESULTS")
    print(f"{'=' * 60}")
    for name, ok in results:
        icon = "✓" if ok else "✗"
        print(f"  {icon} {name}")
    
    success = sum(1 for _, ok in results if ok)
    print(f"\n{success}/{len(results)} products migrated successfully")
    
    # Verify
    if success > 0:
        verify_fix()
