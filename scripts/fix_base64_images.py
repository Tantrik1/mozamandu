#!/usr/bin/env python3
"""
Phase 1: Diagnose which rows in the database have base64 data URIs
         stored in image_url columns (causes PostgREST statement timeouts).
         
Uses PostgREST 'like' filter to identify rows WITHOUT fetching the huge data.
"""

import requests
import json
import sys

SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1ODg1NywiZXhwIjoyMDY2MjM0ODU3fQ.Hr_KRFCup-UpGr2x6FHJI6xGaR5_NNfTaCLb874NNzk'

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}

def check_auth():
    """Verify service role key works."""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/products?select=id&limit=1',
        headers=HEADERS, timeout=10
    )
    print(f"Auth test: HTTP {r.status_code}")
    if r.status_code not in (200, 206):
        print(f"ERROR: {r.text}")
        sys.exit(1)
    return True

def count_base64_rows(table, col):
    """Count rows where col starts with 'data:' (base64 data URI) WITHOUT fetching the data."""
    # PostgREST 'like' filter — only returns id+name, never the huge blob
    url = f'{SUPABASE_URL}/rest/v1/{table}?select=id,name&{col}=like.data:*'
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code == 200:
        rows = r.json()
        return rows
    else:
        # If 'name' column doesn't exist, try just id
        url2 = f'{SUPABASE_URL}/rest/v1/{table}?select=id&{col}=like.data:*'
        r2 = requests.get(url2, headers=HEADERS, timeout=30)
        if r2.status_code == 200:
            return r2.json()
        else:
            print(f"  Error querying {table}.{col}: HTTP {r2.status_code} - {r2.text[:200]}")
            return []

def count_normal_rows(table, col):
    """Count rows where col starts with 'http' (normal URL)."""
    url = f'{SUPABASE_URL}/rest/v1/{table}?select=id&{col}=like.http*&limit=1000'
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code == 200:
        return len(r.json())
    return 0

def count_null_rows(table, col):
    """Count rows where col is null."""
    url = f'{SUPABASE_URL}/rest/v1/{table}?select=id&{col}=is.null&limit=1000'
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code == 200:
        return len(r.json())
    return 0

def count_total(table):
    """Count total rows."""
    url = f'{SUPABASE_URL}/rest/v1/{table}?select=id&limit=1000'
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code == 200:
        return len(r.json())
    return 0

def diagnose():
    print("=" * 70)
    print("DATABASE IMAGE DIAGNOSTIC")
    print("=" * 70)
    
    tables = [
        ('products', 'image_url'),
        ('color_variants', 'image_url'),
        ('product_additional_images', 'image_url'),
        ('product_variants', 'image_url'),
        ('categories', 'image_url'),
        ('subcategories', 'image_url'),
        ('notices', 'image_url'),
        ('banners', 'image_url'),
        ('payment_methods', 'qr_code_url'),
    ]
    
    results = {}
    
    for table, col in tables:
        total = count_total(table)
        base64_rows = count_base64_rows(table, col)
        normal_count = count_normal_rows(table, col)
        null_count = count_null_rows(table, col)
        
        b64_count = len(base64_rows)
        icon = "🚨" if b64_count > 0 else "✅"
        
        print(f"\n{icon} {table}.{col}:")
        print(f"   Total rows: {total}")
        print(f"   Normal URLs (http*): {normal_count}")
        print(f"   Base64 data URIs: {b64_count}")
        print(f"   NULL: {null_count}")
        
        if base64_rows:
            for row in base64_rows:
                name = row.get('name', row.get('id', '?'))
                print(f"   → ID: {row['id']} ({name})")
            results[f"{table}.{col}"] = base64_rows
    
    # Also check products.images array column
    print(f"\n--- Checking products.images (JSON array) ---")
    # We can't easily filter inside JSON arrays with PostgREST
    # Just check if the column exists by fetching ids
    url = f'{SUPABASE_URL}/rest/v1/products?select=id,name,images&limit=200'
    r = requests.get(url, headers=HEADERS, timeout=60)
    if r.status_code == 200:
        rows = r.json()
        b64_in_array = []
        for row in rows:
            imgs = row.get('images')
            if imgs and isinstance(imgs, list):
                for idx, img in enumerate(imgs):
                    if isinstance(img, str) and (img.startswith('data:') or len(img) > 1000):
                        b64_in_array.append((row['id'], row.get('name', '?'), idx))
        if b64_in_array:
            print(f"🚨 Found {len(b64_in_array)} base64 entries in products.images arrays:")
            for pid, pname, idx in b64_in_array:
                print(f"   → Product {pname} ({pid}), images[{idx}]")
        else:
            print(f"✅ No base64 found in products.images arrays")
    elif r.status_code == 500:
        print("⚠️  products.images query timed out (might contain large base64 too)")
    else:
        print(f"⚠️  Could not check products.images: HTTP {r.status_code}")
    
    return results

if __name__ == '__main__':
    check_auth()
    results = diagnose()
    
    total_affected = sum(len(v) for v in results.values())
    print(f"\n{'=' * 70}")
    print(f"SUMMARY: {total_affected} rows contain base64 data URIs that need migration")
    print(f"{'=' * 70}")
