import requests
import boto3
import io
import json
from PIL import Image

SUPABASE_URL = 'https://huwhbxjlyucamitwwhyg.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg4NTcsImV4cCI6MjA2NjIzNDg1N30.cB3YipySfkizYpvwUPd9xlBlq_haPznmEpPgcbAwovQ'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

s3_client = boto3.client(
    's3',
    endpoint_url='https://ab94ca7fe2714291ff48ec76111769e3.r2.cloudflarestorage.com',
    aws_access_key_id='66ba4e715f5e7643bcf8dd8fa71786bc',
    aws_secret_access_key='c1d63b6161fb6e8fdc011098eadf75c4a33e0a7d4cd18b7e1bd548a8a6b5f313',
    region_name='auto'
)

BUCKET_NAME = 'mozamandu'
CUSTOM_DOMAIN = 'https://images.mozamandu.com'

session = requests.Session()
session.headers.update(headers)

def convert_and_upload_to_r2(image_url, key_prefix):
    try:
        res = session.get(image_url, timeout=15)
        if res.status_code != 200:
            print(f"  [ERROR] Failed to fetch {image_url} (HTTP {res.status_code})")
            return None
        
        img = Image.open(io.BytesIO(res.content))
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGBA')
        else:
            img = img.convert('RGB')
            
        output = io.BytesIO()
        img.save(output, format='WEBP', quality=90, optimize=True)
        webp_bytes = output.getvalue()
        
        # Build clean R2 key
        filename = image_url.split('/')[-1].split('?')[0]
        base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
        r2_key = f"{key_prefix}/{base_name}.webp"
        
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=r2_key,
            Body=webp_bytes,
            ContentType='image/webp',
            CacheControl='public, max-age=31536000, immutable'
        )
        
        r2_url = f"{CUSTOM_DOMAIN}/{r2_key}"
        print(f"  [SUCCESS] {image_url} -> {r2_url} ({len(res.content)}B -> {len(webp_bytes)}B)")
        return r2_url
    except Exception as e:
        print(f"  [ERROR] Exception processing {image_url}: {e}")
        return None

def migrate_table_single_column(table_name, column_name):
    print(f"\n================ MIGRATING {table_name}.{column_name} ================")
    res = session.get(f"{SUPABASE_URL}/rest/v1/{table_name}?select=id,{column_name}")
    if res.status_code != 200:
        print(f"Failed to query {table_name} (HTTP {res.status_code})")
        return
        
    rows = res.json()
    migrated_count = 0
    
    for row in rows:
        row_id = row['id']
        url_val = row.get(column_name)
        if url_val and isinstance(url_val, str) and 'supabase.co' in url_val:
            print(f"Processing row {row_id}...")
            r2_url = convert_and_upload_to_r2(url_val, table_name)
            if r2_url:
                patch_res = session.patch(
                    f"{SUPABASE_URL}/rest/v1/{table_name}?id=eq.{row_id}",
                    json={column_name: r2_url}
                )
                if patch_res.status_code in (200, 204):
                    migrated_count += 1
                else:
                    print(f"  [ERROR] Failed to patch DB row {row_id} (HTTP {patch_res.status_code})")
                    
    print(f"Done migrating {table_name}.{column_name}: {migrated_count}/{len(rows)} updated.")

def migrate_table_array_column(table_name, column_name):
    print(f"\n================ MIGRATING ARRAY {table_name}.{column_name} ================")
    res = session.get(f"{SUPABASE_URL}/rest/v1/{table_name}?select=id,{column_name}")
    if res.status_code != 200:
        print(f"Failed to query {table_name} (HTTP {res.status_code})")
        return
        
    rows = res.json()
    migrated_count = 0
    
    for row in rows:
        row_id = row['id']
        arr_val = row.get(column_name)
        if arr_val and isinstance(arr_val, list):
            new_arr = []
            changed = False
            for url_val in arr_val:
                if isinstance(url_val, str) and 'supabase.co' in url_val:
                    r2_url = convert_and_upload_to_r2(url_val, f"{table_name}-array")
                    if r2_url:
                        new_arr.append(r2_url)
                        changed = True
                    else:
                        new_arr.append(url_val)
                else:
                    new_arr.append(url_val)
            if changed:
                patch_res = session.patch(
                    f"{SUPABASE_URL}/rest/v1/{table_name}?id=eq.{row_id}",
                    json={column_name: new_arr}
                )
                if patch_res.status_code in (200, 204):
                    migrated_count += 1
                else:
                    print(f"  [ERROR] Failed to patch DB row {row_id} (HTTP {patch_res.status_code})")
                    
    print(f"Done migrating {table_name}.{column_name} array: {migrated_count} rows updated.")

if __name__ == '__main__':
    # 1. Single URL columns
    migrate_table_single_column('color_variants', 'image_url')
    migrate_table_single_column('product_additional_images', 'image_url')
    migrate_table_single_column('product_variants', 'image_url')
    migrate_table_single_column('products', 'image_url')
    migrate_table_single_column('categories', 'image_url')
    migrate_table_single_column('subcategories', 'image_url')
    migrate_table_single_column('notices', 'image_url')
    migrate_table_single_column('banners', 'image_url')
    
    # 2. Array URL columns
    migrate_table_array_column('products', 'images')
    
    print("\nAll database image migrations completed successfully!")
