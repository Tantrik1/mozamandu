import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { BarChart3, FolderOpen } from 'lucide-react';
import { Plus, Pencil, Trash2, Eye, Search, FileText, Calendar, Clock, Image, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import browserImageCompression from 'browser-image-compression';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
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
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  view_count: number;
  reading_time_minutes: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
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

const emptyCategory = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  is_active: true,
  display_order: 0,
};

export function BlogManagement() {
  const [activeTab, setActiveTab] = useState<'posts' | 'categories'>('posts');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formData, setFormData] = useState(emptyBlog);
  const [categoryFormData, setCategoryFormData] = useState(emptyCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as BlogCategory[];
    },
  });

  // Fetch blogs with category info
  const { data: blogs = [], isLoading } = useQuery({
    queryKey: ['admin-blogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Blog[];
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryFormData) => {
      const { error } = await supabase.from('blog_categories').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      toast({ title: 'Category created successfully' });
      handleCloseCategoryDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create category', description: error.message, variant: 'destructive' });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof categoryFormData }) => {
      const { error } = await supabase.from('blog_categories').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      toast({ title: 'Category updated successfully' });
      handleCloseCategoryDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update category', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      toast({ title: 'Category deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete category', description: error.message, variant: 'destructive' });
    },
  });

  // Blog mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const blogData = {
        ...data,
        category_id: data.category_id || null,
        meta_keywords: data.meta_keywords?.length ? data.meta_keywords : null,
        published_at: data.status === 'published' ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from('blogs').insert([blogData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      toast({ title: 'Blog created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create blog', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const blogData = {
        ...data,
        category_id: data.category_id || null,
        meta_keywords: data.meta_keywords?.length ? data.meta_keywords : null,
        published_at: data.status === 'published' && !editingBlog?.published_at 
          ? new Date().toISOString() 
          : editingBlog?.published_at,
      };
      const { error } = await supabase.from('blogs').update(blogData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      toast({ title: 'Blog updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update blog', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blogs'] });
      toast({ title: 'Blog deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete blog', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBlog(null);
    setFormData(emptyBlog);
    setKeywordsInput('');
  };

  const handleCloseCategoryDialog = () => {
    setIsCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryFormData(emptyCategory);
  };

  const handleEditCategory = (category: BlogCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      is_active: category.is_active,
      display_order: category.display_order,
    });
    setIsCategoryDialogOpen(true);
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || '',
      content: blog.content,
      featured_image_url: blog.featured_image_url || '',
      meta_title: blog.meta_title || '',
      meta_description: blog.meta_description || '',
      meta_keywords: blog.meta_keywords || [],
      og_title: blog.og_title || '',
      og_description: blog.og_description || '',
      og_image_url: blog.og_image_url || '',
      author_name: blog.author_name,
      status: blog.status,
      is_featured: blog.is_featured,
      reading_time_minutes: blog.reading_time_minutes,
      category_id: blog.category_id || '',
    });
    setKeywordsInput(blog.meta_keywords?.join(', ') || '');
    setIsDialogOpen(true);
  };

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

  const handleCategoryNameChange = (name: string) => {
    setCategoryFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
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

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/webp' as const,
      };
      const compressedFile = await browserImageCompression(file, options);
      
      const fileName = `category-${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, compressedFile, { contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      setCategoryFormData(prev => ({ ...prev, image_url: publicUrl }));
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

  const handleSubmit = () => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCategorySubmit = () => {
    if (!categoryFormData.name || !categoryFormData.slug) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryFormData });
    } else {
      createCategoryMutation.mutate(categoryFormData);
    }
  };

  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || blog.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || blog.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  const stats = {
    total: blogs.length,
    published: blogs.filter(b => b.status === 'published').length,
    drafts: blogs.filter(b => b.status === 'draft').length,
    totalViews: blogs.reduce((sum, b) => sum + b.view_count, 0),
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground">Create and manage SEO-optimized blog posts</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <Button 
          variant={activeTab === 'posts' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('posts')}
          className="rounded-b-none"
        >
          <FileText className="h-4 w-4 mr-2" />
          Blog Posts
        </Button>
        <Button 
          variant={activeTab === 'categories' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('categories')}
          className="rounded-b-none"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Categories
        </Button>
      </div>

      {activeTab === 'categories' ? (
        // Categories Tab
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setCategoryFormData(emptyCategory); setEditingCategory(null); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Name *</Label>
                    <Input
                      id="cat-name"
                      value={categoryFormData.name}
                      onChange={(e) => handleCategoryNameChange(e.target.value)}
                      placeholder="Category name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-slug">Slug *</Label>
                    <Input
                      id="cat-slug"
                      value={categoryFormData.slug}
                      onChange={(e) => setCategoryFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                      placeholder="category-slug"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-desc">Description</Label>
                    <Textarea
                      id="cat-desc"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Category description"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image</Label>
                    <div className="flex items-center gap-4">
                      {categoryFormData.image_url && (
                        <img src={categoryFormData.image_url} alt="Category" className="h-16 w-16 object-cover rounded" />
                      )}
                      <Input type="file" accept="image/*" onChange={handleCategoryImageUpload} disabled={uploading} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-order">Display Order</Label>
                    <Input
                      id="cat-order"
                      type="number"
                      value={categoryFormData.display_order}
                      onChange={(e) => setCategoryFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch
                      checked={categoryFormData.is_active}
                      onCheckedChange={(checked) => setCategoryFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={handleCloseCategoryDialog}>Cancel</Button>
                  <Button onClick={handleCategorySubmit} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                    {editingCategory ? 'Update' : 'Create'} Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No categories yet</p>
                </CardContent>
              </Card>
            ) : (
              categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {category.image_url && (
                        <img src={category.image_url} alt={category.name} className="h-12 w-12 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{category.name}</h3>
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">/blog/category/{category.slug}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {blogs.filter(b => b.category_id === category.id).length} posts
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this category?')) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        // Posts Tab
        <>
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setFormData(emptyBlog); setEditingBlog(null); setKeywordsInput(''); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Blog Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="content" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      SEO
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4 mt-4">
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

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category_id || "none"}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value === "none" ? "" : value }))}
                      >
                        <SelectTrigger>
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
                      <Label htmlFor="content">Content *</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Write your blog content here... (Markdown supported)"
                        rows={12}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Featured Image</Label>
                      <div className="flex items-center gap-4">
                        {formData.featured_image_url && (
                          <img 
                            src={formData.featured_image_url} 
                            alt="Featured" 
                            className="h-20 w-32 object-cover rounded-lg border"
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

                  <TabsContent value="seo" className="space-y-4 mt-4">
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

                    <Separator />

                    <h4 className="font-medium flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Open Graph (Social Media)
                    </h4>

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
                      <Label htmlFor="og_description">OG Description</Label>
                      <Textarea
                        id="og_description"
                        value={formData.og_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, og_description: e.target.value }))}
                        placeholder="Description for social media sharing"
                        rows={2}
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
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4 mt-4">
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

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="featured">Featured Post</Label>
                        <p className="text-xs text-muted-foreground">Show this post prominently</p>
                      </div>
                      <Switch
                        id="featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingBlog ? 'Update' : 'Create'} Blog Post
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Drafts</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.drafts}</p>
                  </div>
                  <Pencil className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blogs..."
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Blog List */}
          <div className="space-y-4">
            {filteredBlogs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No blog posts found</p>
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first blog post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredBlogs.map((blog) => (
                <Card key={blog.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {blog.featured_image_url && (
                        <img 
                          src={blog.featured_image_url} 
                          alt={blog.title}
                          className="h-24 w-36 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg line-clamp-1">{blog.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {blog.excerpt || blog.content.substring(0, 150)}...
                            </p>
                          </div>
                          <Badge className={getStatusColor(blog.status)}>{blog.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {getCategoryName(blog.category_id) && (
                            <Badge variant="outline">{getCategoryName(blog.category_id)}</Badge>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(blog.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {blog.reading_time_minutes} min read
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {blog.view_count} views
                          </span>
                          {blog.is_featured && (
                            <Badge variant="outline" className="text-xs">Featured</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/blog/${blog.slug}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(blog)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this blog post?')) {
                              deleteMutation.mutate(blog.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
