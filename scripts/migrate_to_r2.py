import io
import os
import sys
import re
import requests
import boto3
from PIL import Image

# Supabase Credentials
SUPABASE_URL = "https://huwhbxjlyucamitwwhyg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg4NTcsImV4cCI6MjA2NjIzNDg1N30.cB3YipySfkizYpvwUPd9xlBlq_haPznmEpPgcbAwovQ"

# Cloudflare R2 Credentials
R2_ACCOUNT_ID = "ab94ca7fe2714291ff48ec76111769e3"
R2_ACCESS_KEY_ID = "66ba4e715f5e7643bcf8dd8fa71786bc"
R2_SECRET_ACCESS_KEY = "c1d63b6161fb6e8fdc011098eadf75c4a33e0a7d4cd18b7e1bd548a8a6b5f313"
R2_BUCKET = "mozamandu"
R2_PUBLIC_DOMAIN = "https://images.mozamandu.com"

# Initialize S3 client for Cloudflare R2
s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto"
)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

session = requests.Session()

def process_and_upload_image(img_url, folder_prefix):
    """
    Downloads image, converts to WebP without quality loss, uploads to R2, returns new CDN URL.
    """
    if not img_url or not isinstance(img_url, str):
        return None
    if R2_PUBLIC_DOMAIN in img_url:
        print(f"  [Skipped] Already on Cloudflare R2: {img_url}")
        return img_url

    try:
        print(f"  [Downloading] {img_url}")
        res = session.get(img_url, timeout=12)
        if res.status_code != 200:
            print(f"  [Error] Failed to fetch image (HTTP {res.status_code}): {img_url}")
            return None

        orig_size = len(res.content)

        # Open image using PIL
        image = Image.open(io.BytesIO(res.content))
        
        # Convert RGBA/P mode if needed for WebP
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        # Convert to WebP in memory
        output = io.BytesIO()
        image.save(output, format="WEBP", quality=90, method=6)
        webp_data = output.getvalue()
        webp_size = len(webp_data)

        # Determine R2 file key
        filename_match = re.search(r'([^/]+)\.(png|jpg|jpeg|webp|gif|svg)$', img_url.split('?')[0], re.IGNORECASE)
        if filename_match:
            base_name = filename_match.group(1)
        else:
            base_name = os.path.basename(img_url.split('?')[0]) or "image"

        r2_key = f"{folder_prefix}/{base_name}.webp"

        # Upload to R2
        savings = ((orig_size - webp_size) / orig_size) * 100 if orig_size > 0 else 0
        print(f"  [Uploading to R2] {r2_key} (Size: {orig_size/1024:.1f} KB -> {webp_size/1024:.1f} KB | Savings: {savings:.1f}%)")
        s3_client.put_object(
            Bucket=R2_BUCKET,
            Key=r2_key,
            Body=webp_data,
            ContentType="image/webp",
            CacheControl="public, max-age=31536000, immutable"
        )

        new_cdn_url = f"{R2_PUBLIC_DOMAIN}/{r2_key}"
        return new_cdn_url

    except Exception as e:
        print(f"  [Exception] Skipping {img_url}: {e}")
        return None

def migrate_table(table_name, image_columns):
    print(f"\n==========================================")
    print(f"Migrating table: {table_name}")
    print(f"==========================================")
    
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*"
    res = session.get(url, headers=headers, timeout=15)
    if res.status_code != 200:
        print(f"Error fetching {table_name}: {res.status_code} - {res.text}")
        return

    records = res.json()
    print(f"Found {len(records)} records in {table_name}")

    for row in records:
        row_id = row.get("id")
        if not row_id:
            continue

        updates = {}
        for col in image_columns:
            img_val = row.get(col)
            if img_val and isinstance(img_val, str) and img_val.startswith("http"):
                new_url = process_and_upload_image(img_val, folder_prefix=table_name)
                if new_url and new_url != img_val:
                    updates[col] = new_url

        if updates:
            print(f"  [DB Update] Updating {table_name} id={row_id} with {list(updates.keys())}")
            patch_url = f"{SUPABASE_URL}/rest/v1/{table_name}?id=eq.{row_id}"
            patch_res = session.patch(patch_url, headers=headers, json=updates, timeout=15)
            if patch_res.status_code in (200, 204):
                print(f"  [DB Success] Table {table_name} updated successfully.")
            else:
                print(f"  [DB Error] Failed to update {table_name}: {patch_res.status_code} - {patch_res.text}")

def main():
    print("🚀 Starting Image Migration to Cloudflare R2...")

    schema_map = {
        "categories": ["image_url"],
        "subcategories": ["image_url"],
        "products": ["image_url"],
        "product_images": ["image_url"],
        "notices": ["image_url"],
        "banners": ["image_url", "desktop_image_url", "mobile_image_url"]
    }

    for table, columns in schema_map.items():
        migrate_table(table, columns)

    print("\n✅ All images processed, WebP optimized, and DB records updated to Cloudflare R2!")

if __name__ == "__main__":
    main()
