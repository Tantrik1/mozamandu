
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MediaPicker } from './MediaPicker';
import { ButtonColorful } from '@/components/ui/button-colorful';

interface Notice {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function NoticeManagement() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
  });
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch notices',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
          description: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 10MB`,
          variant: "destructive",
        });
        return;
      }

      // Validate it's an image
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

  const uploadImage = async (file: File): Promise<string> => {
    const { prepareImageForUpload, HIGH_COMPRESSION } = await import('@/utils/imageOptimizer');
    const { uploadToR2 } = await import('@/utils/r2Upload');
    
    // Optimize image with aggressive compression for notices (target ~200KB)
    const { file: optimizedFile } = await prepareImageForUpload(file, HIGH_COMPRESSION);
    const publicUrl = await uploadToR2(optimizedFile, 'notice-images');
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = imagePreview || editingNotice?.image_url || null;

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const { ensureUploadedUrl } = await import('@/utils/r2Upload');
      imageUrl = await ensureUploadedUrl(imageUrl, 'notice-images');

      const noticeData = {
        title: formData.title,
        description: formData.description || null,
        image_url: imageUrl,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingNotice) {
        const { error } = await supabase
          .from('notices')
          .update(noticeData)
          .eq('id', editingNotice.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Notice updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('notices')
          .insert([noticeData] as any);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Notice created successfully',
        });
      }

      resetForm();
      fetchNotices();
    } catch (error) {
      console.error('Error saving notice:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notice',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      description: notice.description || '',
      is_active: notice.is_active,
    });
    setImagePreview(notice.image_url);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notice deleted successfully',
      });
      fetchNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notice',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', is_active: true });
    setEditingNotice(null);
    setSelectedImage(null);
    setImagePreview(null);
    setShowForm(false);
  };

  if (isLoading) {
    return <div className="p-6">Loading notices...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notice Management</h1>
          <p className="text-muted-foreground mt-1">Manage homepage notice popups</p>
        </div>
        <ButtonColorful onClick={() => setShowForm(true)} className="h-9 px-4 text-xs">
          <Plus className="h-4 w-4 mr-1.5 text-white" />
          Add Notice
        </ButtonColorful>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingNotice ? 'Edit Notice' : 'Create New Notice'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="image">Image</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMediaPickerOpen(true)}
                  >
                    <ImageIcon className="h-4 w-4 mr-2 text-primary" />
                    {imagePreview ? 'Change Image' : 'Select / Upload Image'}
                  </Button>
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-0 right-0 h-6 w-6 p-0"
                        onClick={() => {
                          setImagePreview(null);
                          setSelectedImage(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="h-9 px-4 text-xs font-bold rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500/60 shadow-2xs active:scale-95 transition-all backdrop-blur-md"
                >
                  Cancel
                </Button>
                <ButtonColorful type="submit" disabled={isSubmitting} className="h-9 px-5 text-xs">
                  {isSubmitting ? 'Saving...' : 'Save Notice'}
                </ButtonColorful>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {notices.map((notice) => (
          <Card key={notice.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{notice.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        notice.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {notice.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {notice.description && (
                    <p className="text-muted-foreground">{notice.description}</p>
                  )}
                  {notice.image_url && (
                    <img
                      src={notice.image_url}
                      alt={notice.title}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(notice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(notice)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(notice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {notices.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No notices found. Create your first notice!</p>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Media Picker Modal */}
      <MediaPicker
        open={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        folder="notice-images"
        onSelect={(url) => {
          setImagePreview(url);
          setSelectedImage(null);
        }}
      />
    </div>
  );
}
