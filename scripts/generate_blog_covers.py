import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

os.makedirs('scripts/covers', exist_ok=True)

BLOG_TITLES = [
    ("The Ultimate Guide to Socks & Foot Hygiene in Nepal", "Choosing the Right Moja for Kathmandu's Climate", "hygiene"),
    ("Cotton vs. Bamboo vs. Synthetic Socks", "Which Fabric Works Best for Daily Wear in Nepal?", "fabrics"),
    ("The Evolution of Men's Boxers & Undergarments", "Comfort, Fit, and Fabric Science in Modern Apparel", "boxers"),
    ("How to Pair Socks with Shoes in Nepal", "A Modern Nepali Fashion Guide for Men & Women", "fashion"),
    ("Why Quality Moja Matters for Himalayan Trekkers", "Foot Care & Cushioning for Active Athletes", "trekking"),
    ("Socks & Underwear Buying Guide 2026", "What Every Nepali Shopper Should Know", "buying_guide"),
    ("The Complete Sock Care & Longevity Handbook", "How to Keep Your Moja Soft, Clean & Odor-Free", "care_guide"),
    ("Winter vs. Summer Footwear Essentials in Kathmandu", "Staying Warm, Dry, and Stylish All Year Round", "climate"),
    ("Understanding Thread Count, Elasticity & Arch Support", "The Engineering Behind Everyday Quality Socks", "engineering"),
    ("Sustainable Fashion in Nepal: Eco-Friendly Moja", "Responsible Manufacturing & Durable Fabrics", "sustainability")
]

PALETTES = [
    ("#1e293b", "#0f172a", "#38bdf8", "#0284c7"),
    ("#0f766e", "#134e4a", "#2dd4bf", "#0d9488"),
    ("#431407", "#7c2d12", "#fb923c", "#ea580c"),
    ("#312e81", "#1e1b4b", "#818cf8", "#4f46e5"),
    ("#14532d", "#052e16", "#4ade80", "#16a34a"),
    ("#581c87", "#3b0764", "#c084fc", "#9333ea"),
    ("#831843", "#500724", "#f472b6", "#db2777"),
    ("#1e3a8a", "#172554", "#60a5fa", "#2563eb"),
    ("#365314", "#1a2e05", "#a3e635", "#65a30d"),
    ("#042f2e", "#021d1d", "#2dd4bf", "#14b8a6")
]

for idx, (title, subtitle, slug_key) in enumerate(BLOG_TITLES):
    c1, c2, accent, badge_bg = PALETTES[idx % len(PALETTES)]
    width, height = 1200, 630
    
    img = Image.new('RGB', (width, height), color=c1)
    draw = ImageDraw.Draw(img)
    
    # Create subtle gradient background
    for y in range(height):
        r = int(int(c1[1:3], 16) + (int(c2[1:3], 16) - int(c1[1:3], 16)) * (y / height))
        g = int(int(c1[3:5], 16) + (int(c2[3:5], 16) - int(c1[3:5], 16)) * (y / height))
        b = int(int(c1[5:7], 16) + (int(c2[5:7], 16) - int(c1[5:7], 16)) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
        
    # Draw decorative subtle circles
    draw.ellipse([800, -100, 1300, 400], fill=None, outline=accent, width=2)
    draw.ellipse([900, 100, 1400, 600], fill=None, outline=accent, width=1)
    
    # Top Badge
    draw.rounded_rectangle([70, 60, 320, 105], radius=10, fill=badge_bg)
    
    try:
        font_badge = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        font_footer = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
    except:
        font_badge = font_title = font_sub = font_footer = ImageFont.load_default()
        
    draw.text((90, 72), "MOZAMANDU BLOG", fill=(255, 255, 255), font=font_badge)
    
    # Title multi-line handling
    words = title.split()
    lines = []
    curr = []
    for w in words:
        curr.append(w)
        if len(" ".join(curr)) > 28:
            curr.pop()
            lines.append(" ".join(curr))
            curr = [w]
    if curr:
        lines.append(" ".join(curr))
        
    y_text = 160
    for line in lines:
        draw.text((70, y_text), line, fill=(255, 255, 255), font=font_title)
        y_text += 55
        
    # Subtitle
    draw.text((70, y_text + 20), subtitle, fill=(220, 225, 230), font=font_sub)
    
    # Bottom brand footer bar
    draw.line([(70, 530), (1130, 530)], fill=(255, 255, 255, 60), width=1)
    draw.text((70, 555), "MOZAMANDU • Premium Moja & Essentials Nepal", fill=accent, font=font_footer)
    draw.text((920, 555), "mozamandu.com", fill=(255, 255, 255), font=font_footer)
    
    out_path = f"scripts/covers/blog_cover_{idx+1}_{slug_key}.webp"
    img.save(out_path, format="WEBP", quality=88)
    print(f"Generated cover {idx+1}: {out_path} ({os.path.getsize(out_path)} bytes)")

print("All 10 blog cover images generated successfully.")
