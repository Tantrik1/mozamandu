import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModernNavbar } from '@/components/navbar/ModernNavbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, ArrowLeft, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';

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
}

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: relatedBlogs = [] } = useQuery({
    queryKey: ['related-blogs', blog?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title, slug, featured_image_url, reading_time_minutes, published_at')
        .eq('status', 'published')
        .neq('id', blog?.id)
        .limit(3);
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
        
        {/* Structured Data */}
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
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg">
            <ReactMarkdown>{blog.content}</ReactMarkdown>
          </div>

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
