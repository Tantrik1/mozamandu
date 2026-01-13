import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileText, Search, Settings2, Image, Save, Eye, HelpCircle, Package } from 'lucide-react';
import browserImageCompression from 'browser-image-compression';
import { RichTextEditor } from './RichTextEditor';
import { BlogFAQsManager } from './BlogFAQsManager';
import { BlogProductsManager } from './BlogProductsManager';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

type BlogStatus = 'draft' | 'published' | 'archived';

const emptyBlog = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image_url: '',
  meta_title: '',
  meta_description: '',
  meta_keywords: [] as string[],
  og_title: '',
  og_description: '',
  og_image_url: '',
  author_name: 'Mozamandu Team',
  status: 'draft' as BlogStatus,
  is_featured: false,
  reading_time_minutes: 5,
  category_id: '' as string,
};

export function BlogPostForm() {
  const { blogId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(blogId);

  const [formData, setFormData] = useState(emptyBlog);
  const [uploading, setUploading] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id, name, slug, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as BlogCategory[];
    },
  });

  // Fetch blog if editing
  const { data: existingBlog, isLoading: loadingBlog } = useQuery({
    queryKey: ['blog', blogId],
    queryFn: async () => {
      if (!blogId) return null;
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', blogId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(blogId),
  });

  // Populate form when editing
  useEffect(() => {
    if (existingBlog) {
      setFormData({
        title: existingBlog.title,
        slug: existingBlog.slug,
        excerpt: existingBlog.excerpt || '',
        content: existingBlog.content,
        featured_image_url: existingBlog.featured_image_url || '',
        meta_title: existingBlog.meta_title || '',
        meta_description: existingBlog.meta_description || '',
        meta_keywords: existingBlog.meta_keywords || [],
        og_title: existingBlog.og_title || '',
        og_description: existingBlog.og_description || '',
        og_image_url: existingBlog.og_image_url || '',
        author_name: existingBlog.author_name,
        status: existingBlog.status as BlogStatus,
        is_featured: existingBlog.is_featured,
        reading_time_minutes: existingBlog.reading_time_minutes,
        category_id: existingBlog.category_id || '',
      });
      setKeywordsInput(existingBlog.meta_keywords?.join(', ') || '');
    }
  }, [existingBlog]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
      meta_title: prev.meta_title || title,
      og_title: prev.og_title || title,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'featured_image_url' | 'og_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp' as const,
      };
      const compressedFile = await browserImageCompression(file, options);
      
      const fileName = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, compressedFile, { contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, [field]: publicUrl }));
      
      if (field === 'featured_image_url' && !formData.og_image_url) {
        setFormData(prev => ({ ...prev, og_image_url: publicUrl }));
      }

      toast({ title: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleKeywordsChange = (value: string) => {
    setKeywordsInput(value);
    const keywords = value.split(',').map(k => k.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, meta_keywords: keywords }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const blogData = {
        ...formData,
        category_id: formData.category_id || null,
        meta_keywords: formData.meta_keywords?.length ? formData.meta_keywords : null,
        published_at: formData.status === 'published' && !existingBlog?.published_at
          ? new Date().toISOString()
          : existingBlog?.published_at || null,
      };

      if (isEditing && blogId) {
        const { error } = await supabase
          .from('blogs')
          .update(blogData)
          .eq('id', blogId);
        if (error) throw error;
        toast({ title: 'Blog updated successfully' });
      } else {
        const { error } = await supabase
          .from('blogs')
          .insert([blogData]);
        if (error) throw error;
        toast({ title: 'Blog created successfully' });
      }

      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      navigate('/admin/blogs');
    } catch (error: any) {
      toast({ 
        title: isEditing ? 'Failed to update blog' : 'Failed to create blog', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingBlog) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/blogs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h1>
        </div>
        <div className="flex gap-2">
          {formData.slug && (
            <Button 
              variant="outline" 
              onClick={() => window.open(`/blog/${formData.slug}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="content">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="faqs" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                FAQs
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter blog title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/blog/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                      placeholder="url-slug"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief summary of the blog post"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">{formData.excerpt?.length || 0}/160 characters</p>
              </div>

              <div className="space-y-2">
                <Label>Content *</Label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="Write your blog content here..."
                />
              </div>

              <div className="space-y-2">
                <Label>Featured Image</Label>
                <div className="flex items-center gap-4">
                  {formData.featured_image_url && (
                    <img 
                      src={formData.featured_image_url} 
                      alt="Featured" 
                      className="h-24 w-40 object-cover rounded-lg border"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'featured_image_url')}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 1200x630px for optimal social sharing
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Engine Preview
                </h4>
                <div className="space-y-1">
                  <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                    {formData.meta_title || formData.title || 'Page Title'}
                  </p>
                  <p className="text-green-700 text-sm">
                    mozamandu.com/blog/{formData.slug || 'url-slug'}
                  </p>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {formData.meta_description || formData.excerpt || 'Meta description will appear here...'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="meta_title">Meta Title</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                    placeholder="SEO title (50-60 characters)"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">{formData.meta_title?.length || 0}/60 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_keywords">Keywords</Label>
                  <Input
                    id="meta_keywords"
                    value={keywordsInput}
                    onChange={(e) => handleKeywordsChange(e.target.value)}
                    placeholder="socks nepal, moja, mozamandu (comma separated)"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.meta_keywords?.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="SEO description (150-160 characters)"
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{formData.meta_description?.length || 0}/160 characters</p>
              </div>

              <Separator />

              <h4 className="font-medium flex items-center gap-2">
                <Image className="h-4 w-4" />
                Open Graph (Social Media)
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="og_title">OG Title</Label>
                  <Input
                    id="og_title"
                    value={formData.og_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, og_title: e.target.value }))}
                    placeholder="Title for social media sharing"
                  />
                </div>

                <div className="space-y-2">
                  <Label>OG Image</Label>
                  <div className="flex items-center gap-4">
                    {formData.og_image_url && (
                      <img 
                        src={formData.og_image_url} 
                        alt="OG" 
                        className="h-16 w-24 object-cover rounded border"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'og_image_url')}
                      disabled={uploading}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_description">OG Description</Label>
                <Textarea
                  id="og_description"
                  value={formData.og_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, og_description: e.target.value }))}
                  placeholder="Description for social media sharing"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="faqs" className="space-y-6">
              {blogId ? (
                <BlogFAQsManager blogId={blogId} />
              ) : (
                <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Save the blog first</p>
                  <p className="text-sm">You can add FAQs after creating the blog post</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              {blogId ? (
                <BlogProductsManager blogId={blogId} />
              ) : (
                <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Save the blog first</p>
                  <p className="text-sm">You can link products after creating the blog post</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: BlogStatus) => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))}
                    placeholder="Author name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reading_time">Reading Time (minutes)</Label>
                  <Input
                    id="reading_time"
                    type="number"
                    value={formData.reading_time_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, reading_time_minutes: parseInt(e.target.value) || 5 }))}
                    min={1}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="featured">Featured Post</Label>
                  <p className="text-sm text-muted-foreground">Show this post prominently on the blog page</p>
                </div>
                <Switch
                  id="featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
