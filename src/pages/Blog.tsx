import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ModernNavbar } from '@/components/navbar/ModernNavbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, ArrowRight, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
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
  author_name: string;
  reading_time_minutes: number;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
}

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['public-blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as BlogCategory[];
    },
  });

  const { data: blogs = [], isLoading } = useQuery({
    queryKey: ['public-blogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as Blog[];
    },
  });

  const filteredBlogs = selectedCategory 
    ? blogs.filter(b => b.category_id === selectedCategory)
    : blogs;

  const featuredBlogs = filteredBlogs.filter(b => b.is_featured);
  const regularBlogs = filteredBlogs.filter(b => !b.is_featured);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  return (
    <>
      <Helmet>
        <title>Blog - Mozamandu | Socks Tips & Updates from Nepal</title>
        <meta name="description" content="Discover tips on choosing the best socks in Nepal, seasonal guides, and updates from Mozamandu - Nepal's premium sock destination." />
        <meta property="og:title" content="Blog - Mozamandu" />
        <meta property="og:description" content="Discover tips on choosing the best socks in Nepal, seasonal guides, and updates from Mozamandu." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mozamandu.com/blog" />
        <meta property="og:image" content="https://mozamandu.com/lovable-uploads/84f1077a-8761-4272-88fd-ec35838bbd2b.png" />
        <link rel="canonical" href="https://mozamandu.com/blog" />
        
        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://mozamandu.com" },
              { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://mozamandu.com/blog" }
            ]
          })}
        </script>
        
        {/* Blog CollectionPage Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Mozamandu Blog - Socks Tips & Updates",
            "description": "Discover tips on choosing the best socks in Nepal, seasonal guides, and updates from Mozamandu.",
            "url": "https://mozamandu.com/blog",
            "isPartOf": {
              "@type": "WebSite",
              "name": "Mozamandu",
              "url": "https://mozamandu.com"
            },
            "mainEntity": {
              "@type": "ItemList",
              "numberOfItems": blogs.length,
              "itemListElement": blogs.slice(0, 10).map((blog, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "BlogPosting",
                  "headline": blog.title,
                  "url": `https://mozamandu.com/blog/${blog.slug}`,
                  "image": blog.featured_image_url,
                  "datePublished": blog.published_at || blog.created_at,
                  "author": {
                    "@type": "Person",
                    "name": blog.author_name
                  }
                }
              }))
            }
          })}
        </script>
      </Helmet>

      <ModernNavbar />
      
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Mozamandu Blog</h1>
              <p className="text-xl text-muted-foreground">
                Tips, guides, and stories about quality socks in Nepal
              </p>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        {categories.length > 0 && (
          <section className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    !selectedCategory 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  All Posts
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                      selectedCategory === category.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <FolderOpen className="h-3 w-3" />
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No blog posts found. Check back soon!</p>
            </div>
          ) : (
            <>
              {/* Featured Posts */}
              {featuredBlogs.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-2xl font-bold mb-6">Featured Posts</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {featuredBlogs.slice(0, 2).map((blog) => (
                      <Link key={blog.id} to={`/blog/${blog.slug}`}>
                        <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow group">
                          {blog.featured_image_url && (
                            <div className="relative h-64 overflow-hidden">
                              <img
                                src={blog.featured_image_url}
                                alt={blog.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <Badge className="absolute top-4 left-4 bg-primary">Featured</Badge>
                            </div>
                          )}
                          <CardContent className="p-6">
                            {getCategoryName(blog.category_id) && (
                              <Badge variant="outline" className="mb-2">{getCategoryName(blog.category_id)}</Badge>
                            )}
                            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                              {blog.title}
                            </h3>
                            <p className="text-muted-foreground line-clamp-2 mb-4">
                              {blog.excerpt || blog.content.substring(0, 150)}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {blog.author_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(blog.published_at || blog.created_at), 'MMM d, yyyy')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {blog.reading_time_minutes} min
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* All Posts */}
              <section>
                <h2 className="text-2xl font-bold mb-6">Latest Posts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularBlogs.map((blog) => (
                    <Link key={blog.id} to={`/blog/${blog.slug}`}>
                      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow group">
                        {blog.featured_image_url && (
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={blog.featured_image_url}
                              alt={blog.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <CardContent className="p-5">
                          {getCategoryName(blog.category_id) && (
                            <Badge variant="outline" className="mb-2 text-xs">{getCategoryName(blog.category_id)}</Badge>
                          )}
                          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {blog.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {blog.excerpt || blog.content.substring(0, 100)}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(blog.published_at || blog.created_at), 'MMM d')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {blog.reading_time_minutes} min read
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-primary text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                            Read more <ArrowRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
