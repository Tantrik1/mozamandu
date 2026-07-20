import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModernNavbar } from '@/components/navbar/ModernNavbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calendar, Clock, User, ArrowLeft, Share2, HelpCircle, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/hooks/use-toast';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  author_name: string;
  reading_time_minutes: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
}

interface BlogFAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

interface BlogProduct {
  id: string;
  product_id: string;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number | null;
  status: string;
}

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ['blog', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      if (error) throw error;
      return data as Blog;
    },
    enabled: !!slug,
  });

  // Increment view count
  const viewMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('blogs')
        .update({ view_count: (blog?.view_count || 0) + 1 })
        .eq('id', id);
    },
  });

  useEffect(() => {
    if (blog?.id) {
      viewMutation.mutate(blog.id);
    }
  }, [blog?.id]);

  // Fetch category info
  const { data: category } = useQuery({
    queryKey: ['blog-category', blog?.category_id],
    queryFn: async () => {
      if (!blog?.category_id) return null;
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id, name, slug')
        .eq('id', blog.category_id)
        .maybeSingle();
      if (error) throw error;
      return data as BlogCategory | null;
    },
    enabled: !!blog?.category_id,
  });

  // Fetch blog FAQs
  const { data: faqs = [] } = useQuery({
    queryKey: ['blog-faqs-public', blog?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_faqs')
        .select('id, question, answer, display_order')
        .eq('blog_id', blog?.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as BlogFAQ[];
    },
    enabled: !!blog?.id,
  });

  // Fetch blog products
  const { data: blogProducts = [] } = useQuery({
    queryKey: ['blog-products-public', blog?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_products')
        .select('id, product_id, display_order')
        .eq('blog_id', blog?.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as BlogProduct[];
    },
    enabled: !!blog?.id,
  });

  // Fetch product details
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-blog', blogProducts.map(bp => bp.product_id)],
    queryFn: async () => {
      if (blogProducts.length === 0) return [];
      const productIds = blogProducts.map(bp => bp.product_id);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, selling_price, status')
        .in('id', productIds)
        .eq('status', 'active');
      if (error) throw error;
      return data as Product[];
    },
    enabled: blogProducts.length > 0,
  });

  const { data: relatedBlogs = [] } = useQuery({
    queryKey: ['related-blogs', blog?.id, blog?.category_id],
    queryFn: async () => {
      let query = supabase
        .from('blogs')
        .select('id, title, slug, featured_image_url, reading_time_minutes, published_at')
        .eq('status', 'published')
        .neq('id', blog?.id)
        .limit(3);
      
      if (blog?.category_id) {
        query = query.eq('category_id', blog.category_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!blog?.id,
  });

  const handleShare = async () => {
    try {
      await navigator.share({
        title: blog?.title,
        text: blog?.excerpt || blog?.meta_description || '',
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  // Generate FAQ schema for SEO
  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  if (isLoading) {
    return (
      <>
        <ModernNavbar />
        <main className="min-h-screen bg-background py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <Skeleton className="h-96 w-full mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !blog) {
    return (
      <>
        <ModernNavbar />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Blog post not found</h1>
            <Link to="/blog">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{blog.meta_title || blog.title} | Mozamandu</title>
        <meta name="description" content={blog.meta_description || blog.excerpt || blog.content.substring(0, 160)} />
        {blog.meta_keywords && <meta name="keywords" content={blog.meta_keywords.join(', ')} />}
        <meta property="og:title" content={blog.og_title || blog.title} />
        <meta property="og:description" content={blog.og_description || blog.excerpt || blog.content.substring(0, 160)} />
        {blog.og_image_url && <meta property="og:image" content={blog.og_image_url} />}
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={blog.published_at || blog.created_at} />
        <meta property="article:author" content={blog.author_name} />
        <link rel="canonical" href={`https://mozamandu.com/blog/${blog.slug}`} />
        
        {/* Blog Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "image": blog.featured_image_url || blog.og_image_url,
            "datePublished": blog.published_at || blog.created_at,
            "dateModified": blog.published_at || blog.created_at,
            "author": {
              "@type": "Person",
              "name": blog.author_name
            },
            "publisher": {
              "@type": "Organization",
              "name": "Mozamandu",
              "logo": {
                "@type": "ImageObject",
                "url": "https://mozamandu.com/logo.png"
              }
            },
            "description": blog.meta_description || blog.excerpt,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://mozamandu.com/blog/${blog.slug}`
            }
          })}
        </script>

        {/* FAQ Structured Data */}
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
      </Helmet>

      <ModernNavbar />
      
      <main className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-foreground">Blog</Link>
              {category && (
                <>
                  <span>/</span>
                  <Link to={`/blog?category=${category.id}`} className="hover:text-foreground">{category.name}</Link>
                </>
              )}
              <span>/</span>
              <span className="text-foreground line-clamp-1">{blog.title}</span>
            </nav>
          </div>
        </div>

        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {blog.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {blog.author_name}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(blog.published_at || blog.created_at), 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {blog.reading_time_minutes} min read
              </span>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>

            {blog.meta_keywords && blog.meta_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blog.meta_keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            )}
          </header>

          {/* Featured Image */}
          {blog.featured_image_url && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={blog.featured_image_url}
                alt={blog.title}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Featured Products Section */}
          {products.length > 0 && (
            <section className="mt-12 p-6 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-2 mb-6">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Featured Products</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Link key={product.id} to={`/product/${product.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                      <div className="aspect-square overflow-hidden bg-muted">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </p>
                        {product.selling_price && (
                          <p className="text-primary font-bold mt-1">
                            Rs. {product.selling_price}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAQs Section */}
          {faqs.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center gap-2 mb-6">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* Author Box */}
          <div className="mt-12 p-6 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{blog.author_name}</p>
                <p className="text-muted-foreground text-sm">
                  Sharing insights about quality socks and comfort wear in Nepal
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedBlogs.length > 0 && (
          <section className="bg-muted/30 py-12">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedBlogs.map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                    <div className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {post.featured_image_url && (
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2">
                          {post.reading_time_minutes} min read
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Back to Blog */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
