import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

const SITE_URL = "https://mozamandu.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published blogs
    const { data: blogs, error: blogsError } = await supabase
      .from("blogs")
      .select("slug, updated_at, published_at, featured_image_url, title, meta_description")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (blogsError) {
      console.error("Error fetching blogs:", blogsError);
    }

    // Fetch all active products with image data for image sitemap
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, updated_at, image_url, meta_title, meta_description, description")
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (productsError) {
      console.error("Error fetching products:", productsError);
    }

    // Fetch all active categories
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, updated_at, image_url")
      .eq("status", "active");

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
    }

    const today = new Date().toISOString().split("T")[0];

    // Static pages
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily", lastmod: today },
      { loc: "/shop", priority: "0.95", changefreq: "daily", lastmod: today },
      { loc: "/blog", priority: "0.90", changefreq: "daily", lastmod: today },
      { loc: "/about", priority: "0.7", changefreq: "monthly", lastmod: today },
      { loc: "/contact", priority: "0.7", changefreq: "monthly", lastmod: today },
      { loc: "/faq", priority: "0.6", changefreq: "monthly", lastmod: today },
      { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly", lastmod: today },
      { loc: "/terms-conditions", priority: "0.3", changefreq: "yearly", lastmod: today },
      { loc: "/shipping-policy", priority: "0.3", changefreq: "yearly", lastmod: today },
    ];

    // Helper function to escape XML special characters
    const escapeXml = (str: string | null | undefined): string => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    // Build sitemap XML with image namespace
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
`;

    // Add static pages
    for (const page of staticPages) {
      sitemap += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add blog posts with featured images
    if (blogs && blogs.length > 0) {
      for (const blog of blogs) {
        const lastmod = blog.updated_at
          ? new Date(blog.updated_at).toISOString().split("T")[0]
          : blog.published_at
            ? new Date(blog.published_at).toISOString().split("T")[0]
            : today;

        sitemap += `  <url>
    <loc>${SITE_URL}/blog/${blog.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

        // Add image sitemap tag for blog featured image
        if (blog.featured_image_url) {
          sitemap += `
    <image:image>
      <image:loc>${escapeXml(blog.featured_image_url)}</image:loc>
      <image:title>${escapeXml(blog.title)}</image:title>
      <image:caption>${escapeXml(blog.meta_description || blog.title)}</image:caption>
    </image:image>`;
        }

        sitemap += `
  </url>
`;
      }
    }

    // Add products with image sitemap tags
    if (products && products.length > 0) {
      for (const product of products) {
        const lastmod = product.updated_at ? new Date(product.updated_at).toISOString().split("T")[0] : today;

        sitemap += `  <url>
    <loc>${SITE_URL}/product/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>`;

        // Add image sitemap tag for product image (important for Google Image Search)
        if (product.image_url) {
          const imageTitle = product.meta_title || product.name;
          const imageCaption = product.meta_description || product.description || `Buy ${product.name} at Mozamandu Nepal`;
          
          sitemap += `
    <image:image>
      <image:loc>${escapeXml(product.image_url)}</image:loc>
      <image:title>${escapeXml(imageTitle)}</image:title>
      <image:caption>${escapeXml(imageCaption.substring(0, 160))}</image:caption>
    </image:image>`;
        }

        sitemap += `
  </url>
`;
      }
    }

    // Add category pages with images
    if (categories && categories.length > 0) {
      for (const category of categories) {
        const lastmod = category.updated_at ? new Date(category.updated_at).toISOString().split("T")[0] : today;

        sitemap += `  <url>
    <loc>${SITE_URL}/shop?category=${encodeURIComponent(category.name)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>`;

        // Add image sitemap tag for category image
        if (category.image_url) {
          sitemap += `
    <image:image>
      <image:loc>${escapeXml(category.image_url)}</image:loc>
      <image:title>${escapeXml(category.name)} - Mozamandu Nepal</image:title>
      <image:caption>Shop ${escapeXml(category.name)} collection at Mozamandu Nepal</image:caption>
    </image:image>`;
        }

        sitemap += `
  </url>
`;
      }
    }

    sitemap += `</urlset>`;

    console.log(`Sitemap generated: ${staticPages.length} static pages, ${blogs?.length || 0} blogs, ${products?.length || 0} products, ${categories?.length || 0} categories`);

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`,
      { headers: corsHeaders, status: 200 },
    );
  }
});
