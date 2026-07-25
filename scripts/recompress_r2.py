#!/usr/bin/env python3
"""
Re-compress the R2 images to proper WebP format (currently raw JPEG/PNG with .webp extension).
Downloads from R2, converts to WebP with Pillow, re-uploads.
"""

import requests
import boto3
import io
from PIL import Image

CDN_BASE = 'https://images.mozamandu.com'
SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk'

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}

s3 = boto3.client(
    's3',
    endpoint_url='https://ab94ca7fe2714291ff48ec76111769e3.r2.cloudflarestorage.com',
    aws_access_key_id='66ba4e715f5e7643bcf8dd8fa71786bc',
    aws_secret_access_key='c1d63b6161fb6e8fdc011098eadf75c4a33e0a7d4cd18b7e1bd548a8a6b5f313',
    region_name='auto'
)
BUCKET = 'mozamandu'

# Fetch current product image URLs from DB
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/products?select=id,name,image_url',
    headers=HEADERS, timeout=30
)
products = r.json()
print(f"Found {len(products)} products")

for p in products:
    url = p.get('image_url', '')
    name = p.get('name', '?')
    
    if not url or not url.startswith('https://images.mozamandu.com'):
        print(f"  Skip {name}: not on R2 CDN")
        continue
    
    print(f"\nProcessing: {name}")
    print(f"  URL: {url}")
    
    # Download current image
    resp = requests.get(url, timeout=30)
    if resp.status_code != 200:
        print(f"  ✗ Download failed: HTTP {resp.status_code}")
        continue
    
    original_size = len(resp.content)
    print(f"  Original size: {original_size:,} bytes")
    
    # Convert to proper WebP
    try:
        img = Image.open(io.BytesIO(resp.content))
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGBA')
        else:
            img = img.convert('RGB')
        
        # Resize if very large (max 2048px on longest side)
        max_dim = 2048
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            print(f"  Resized to {new_size}")
        
        out = io.BytesIO()
        img.save(out, format='WEBP', quality=85, optimize=True)
        webp_bytes = out.getvalue()
        
        print(f"  WebP size: {len(webp_bytes):,} bytes ({len(webp_bytes)/original_size*100:.1f}%)")
        
        # Re-upload to same R2 key
        r2_key = url.replace(f'{CDN_BASE}/', '')
        s3.put_object(
            Bucket=BUCKET,
            Key=r2_key,
            Body=webp_bytes,
            ContentType='image/webp',
            CacheControl='public, max-age=31536000, immutable',
        )
        print(f"  ✓ Re-uploaded: {url}")
    except Exception as e:
        print(f"  ✗ Conversion error: {e}")

print("\n✅ Done! All images re-compressed to proper WebP.")
