import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, FolderOpen, Upload, ImageIcon } from 'lucide-react';
import { MediaPicker } from './MediaPicker';

interface Category {
  id: string;
  name: string;
  description: string;
  status: 'on' | 'off';
  image_url?: string;
  created_at: string;
}

export const CategoryManagement = memo(function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: true,
  });
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } else {
      setCategories((data || []) as Category[]);
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB - will be compressed automatically)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: `File size exceeds 10MB limit`,
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { prepareImageForUpload, THUMBNAIL_COMPRESSION } = await import('@/utils/imageOptimizer');
      const { uploadToR2 } = await import('@/utils/r2Upload');
      
      // Use aggressive thumbnail compression for category images (~150KB)
      const { file: optimizedFile } = await prepareImageForUpload(file, THUMBNAIL_COMPRESSION);
      const publicUrl = await uploadToR2(optimizedFile, 'categories');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    let imageUrl = imagePreview || editingCategory?.image_url || null;
    
    if (selectedImage) {
      const uploadedUrl = await uploadImage(selectedImage);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        toast({
          title: "Error",
          description: "Failed to upload image",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
    }

    try {
      const { ensureUploadedUrl } = await import('@/utils/r2Upload');
      imageUrl = await ensureUploadedUrl(imageUrl, 'categories');
    } catch (guardErr) {
      toast({
        title: "Upload Error",
        description: guardErr instanceof Error ? guardErr.message : "Failed to process image",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    const categoryData = {
      name: formData.name,
      description: formData.description,
      status: formData.status ? 'on' : 'off' as 'on' | 'off',
      image_url: imageUrl,
    };

    let error;
    
    if (editingCategory) {
      ({ error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', editingCategory.id));
    } else {
      ({ error } = await supabase
        .from('categories')
        .insert([categoryData]));
    }

    setIsUploading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
    });
    
    resetForm();
    setIsCreateModalOpen(false);
    fetchCategories();
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      status: category.status === 'on',
    });
    if (category.image_url) {
      setImagePreview(category.image_url);
    }
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      fetchCategories();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: true,
    });
    setEditingCategory(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Category Management</h2>
          <p className="text-muted-foreground mt-1">Organize your products into categories</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl shadow-xl">
            <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!formData.name.trim()) {
                toast({ title: 'Validation Error', description: 'Category name is required', variant: 'destructive' });
                return;
              }
              handleSubmit(e);
            }} className="p-6 space-y-5">
              
              {/* Single Interactive Dropzone Card */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category Image (1:1 Ratio)
                </Label>
                <div 
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="relative group w-full aspect-square max-w-[180px] mx-auto border-2 border-dashed border-border hover:border-primary/50 rounded-2xl overflow-hidden bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors flex items-center justify-center"
                >
                  {imagePreview ? (
                    <>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="destructive"
                          className="h-8 w-8 rounded-full"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Click to select image</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Pick or upload to R2</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-1">
                  Category Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ankle Socks"
                  className="h-11 font-medium"
                />
              </div>
              
              {/* Category Description Input */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly describe products in this category..."
                  rows={3}
                />
              </div>
              
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                <Label htmlFor="status" className="text-sm font-semibold cursor-pointer">
                  Category Active Status
                </Label>
                <Switch
                  id="status"
                  checked={formData.status}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading} className="bg-primary hover:bg-primary/90 font-semibold px-5">
                  {isUploading ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredCategories.length} of {categories.length} categories
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              {/* 1:1 Image */}
              <div className="relative aspect-square bg-muted overflow-hidden">
                {category.image_url ? (
                  <img 
                    src={category.image_url} 
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <FolderOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                {/* Overlay with actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Status Badge */}
                <Badge 
                  variant={category.status === 'on' ? 'default' : 'secondary'}
                  className="absolute top-2 left-2"
                >
                  {category.status === 'on' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold truncate">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {category.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Media Picker Modal */}
      <MediaPicker
        open={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        folder="categories"
        onSelect={(url) => {
          setImagePreview(url);
          setSelectedImage(null); // URL already uploaded via MediaPicker
        }}
      />
    </div>
  );
});

export default CategoryManagement;
