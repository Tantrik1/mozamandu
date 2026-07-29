
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, FolderOpen, Upload, ImageIcon, X, Package } from 'lucide-react';
import { MediaPicker } from './MediaPicker';
import { ButtonColorful } from '@/components/ui/button-colorful';

interface Category {
  id: string;
  name: string;
}

interface DiscountTier {
  id?: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}


interface Subcategory {
  id: string;
  name: string;
  description: string;
  min_selling_price: number;
  max_selling_price: number;
  minimum_quantity: number;
  status: 'on' | 'off';
  category_id: string;
  image_url?: string;
  categories: { name: string };
  created_at: string;
}

export function SubcategoryManagement() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    min_selling_price: '',
    max_selling_price: '',
    minimum_quantity: '',
    status: true,
  });
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  useEffect(() => {
    fetchSubcategories();
    fetchCategories();
  }, []);

  const fetchSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select(`
        *,
        categories (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch subcategories",
        variant: "destructive",
      });
    } else {
      setSubcategories((data || []) as Subcategory[]);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('status', 'on');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } else {
      setCategories(data || []);
    }
  };

  const fetchDiscountTiers = async (subcategoryId: string): Promise<DiscountTier[]> => {
    const { data, error } = await supabase
      .from('discount_tiers')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .order('min_quantity', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch discount tiers",
        variant: "destructive",
      });
      return [];
    }
    // Support both discount_amount (external DB) and discount_percentage (Lovable Cloud) columns
    return (data || []).map((tier: any) => ({
      id: tier.id,
      min_quantity: tier.min_quantity,
      max_quantity: tier.max_quantity,
      // Prefer discount_amount, fallback to discount_percentage for backward compatibility
      discount_amount: tier.discount_amount ?? tier.discount_percentage ?? 0
    }));
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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { prepareImageForUpload, THUMBNAIL_COMPRESSION } = await import('@/utils/imageOptimizer');
      const { uploadToR2 } = await import('@/utils/r2Upload');
      
      // Use aggressive thumbnail compression (~150KB)
      const { file: optimizedFile } = await prepareImageForUpload(file, THUMBNAIL_COMPRESSION);
      const publicUrl = await uploadToR2(optimizedFile, 'subcategories');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      return null;
    }
  };

  const addDiscountTier = () => {
    setDiscountTiers([...discountTiers, {
      min_quantity: 1,
      max_quantity: null,
      discount_amount: 0
    }]);
  };

  const removeDiscountTier = (index: number) => {
    const newTiers = discountTiers.filter((_, i) => i !== index);
    setDiscountTiers(newTiers);
  };

  const updateDiscountTier = (index: number, field: keyof DiscountTier, value: any) => {
    const newTiers = [...discountTiers];
    (newTiers[index] as any)[field] = value;
    setDiscountTiers(newTiers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = imagePreview || editingSubcategory?.image_url || null;
    
    // Upload new image if selected
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
        return;
      }
    }

    try {
      const { ensureUploadedUrl } = await import('@/utils/r2Upload');
      imageUrl = await ensureUploadedUrl(imageUrl, 'subcategories');
    } catch (guardErr) {
      toast({
        title: "Upload Error",
        description: guardErr instanceof Error ? guardErr.message : "Failed to process image",
        variant: "destructive",
      });
      return;
    }

    const subcategoryData = {
      name: formData.name,
      description: formData.description,
      category_id: formData.category_id,
      min_selling_price: parseFloat(formData.min_selling_price),
      max_selling_price: parseFloat(formData.max_selling_price) || parseFloat(formData.min_selling_price),
      minimum_quantity: parseInt(formData.minimum_quantity),
      status: formData.status ? 'on' : 'off' as 'on' | 'off',
      image_url: imageUrl,
    };

    let error;
    let subcategoryId;
    
    if (editingSubcategory) {
      ({ error } = await supabase
        .from('subcategories')
        .update(subcategoryData)
        .eq('id', editingSubcategory.id));
      subcategoryId = editingSubcategory.id;
    } else {
      const { data, error: insertError } = await supabase
        .from('subcategories')
        .insert([subcategoryData])
        .select('id')
        .single();
      error = insertError;
      subcategoryId = data?.id;
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Handle discount tiers
    if (subcategoryId) {
      // Always delete existing tiers when editing (also allows clearing all tiers)
      if (editingSubcategory) {
        const { error: deleteError } = await supabase
          .from('discount_tiers')
          .delete()
          .eq('subcategory_id', subcategoryId);

        if (deleteError) {
          toast({
            title: "Error",
            description: `Failed to update discount tiers: ${deleteError.message}`,
            variant: "destructive",
          });
          return;
        }
      }

      if (discountTiers.length > 0) {
        // Insert new tiers - use discount_amount for price-based discounts
        const tiersToInsert = discountTiers.map((tier) => ({
          subcategory_id: subcategoryId,
          min_quantity: tier.min_quantity,
          max_quantity: tier.max_quantity,
          discount_amount: Number(tier.discount_amount) || 0,
        }));


        const { error: tiersError } = await supabase
          .from('discount_tiers')
          .insert(tiersToInsert as any);

        if (tiersError) {
          toast({
            title: "Error",
            description: `Discount tiers failed to save: ${tiersError.message}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    toast({
      title: "Success",
      description: `Subcategory ${editingSubcategory ? 'updated' : 'created'} successfully`,
    });
    
    resetForm();
    setIsCreateModalOpen(false);
    fetchSubcategories();
  };

  const handleEdit = async (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      name: subcategory.name,
      description: subcategory.description,
      category_id: subcategory.category_id,
      min_selling_price: subcategory.min_selling_price.toString(),
      max_selling_price: subcategory.max_selling_price?.toString() || subcategory.min_selling_price.toString(),
      minimum_quantity: subcategory.minimum_quantity.toString(),
      status: subcategory.status === 'on',
    });
    
    // Set existing image preview
    if (subcategory.image_url) {
      setImagePreview(subcategory.image_url);
    }
    
    // Fetch existing discount tiers
    const tiers = await fetchDiscountTiers(subcategory.id);
    setDiscountTiers(tiers);
    
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;

    const { error } = await supabase
      .from('subcategories')
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
        description: "Subcategory deleted successfully",
      });
      fetchSubcategories();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      min_selling_price: '',
      max_selling_price: '',
      minimum_quantity: '',
      status: true,
    });
    setEditingSubcategory(null);
    setDiscountTiers([]);
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Subcategory Management</h2>
          <p className="text-muted-foreground mt-1">Manage product subcategories</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <ButtonColorful onClick={resetForm} className="h-9 px-4 text-xs">
              <Plus className="h-4 w-4 mr-1.5 text-white" />
              Add Subcategory
            </ButtonColorful>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl shadow-2xl">
            <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/60">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                {editingSubcategory ? 'Edit Subcategory' : 'Create New Subcategory'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingSubcategory ? 'Edit subcategory details' : 'Form to create a new subcategory'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!formData.name.trim()) {
                toast({ title: 'Validation Error', description: 'Subcategory name is required', variant: 'destructive' });
                return;
              }
              if (!formData.category_id) {
                toast({ title: 'Validation Error', description: 'Please select a parent category', variant: 'destructive' });
                return;
              }
              if (!formData.min_selling_price || parseFloat(formData.min_selling_price) < 0) {
                toast({ title: 'Validation Error', description: 'Min selling price must be a valid non-negative number', variant: 'destructive' });
                return;
              }
              if (formData.max_selling_price && parseFloat(formData.max_selling_price) < parseFloat(formData.min_selling_price)) {
                toast({ title: 'Validation Error', description: 'Max selling price cannot be less than min selling price', variant: 'destructive' });
                return;
              }
              handleSubmit(e);
            }} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Image Column */}
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Subcategory Cover Image
                  </Label>
                  <div 
                    onClick={() => setIsMediaPickerOpen(true)}
                    className="relative group w-full aspect-square border-2 border-dashed border-border hover:border-primary/50 rounded-2xl overflow-hidden bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors flex items-center justify-center"
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

                {/* Details Column */}
                <div className="space-y-4 md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-1">
                        Subcategory Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Ankle Box Socks"
                        className="h-11 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-sm font-semibold flex items-center gap-1">
                        Parent Category <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={formData.category_id} 
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger className="h-11 font-medium">
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter subcategory description..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              {/* Pricing & MOQ Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
                <div className="space-y-2">
                  <Label htmlFor="min_selling_price" className="text-sm font-semibold flex items-center gap-1">
                    Min Selling Price (Rs.) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">Rs.</span>
                    <Input
                      id="min_selling_price"
                      type="number"
                      step="0.01"
                      value={formData.min_selling_price}
                      onChange={(e) => setFormData({ ...formData, min_selling_price: e.target.value })}
                      placeholder="100.00"
                      className="pl-11 h-11 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_selling_price" className="text-sm font-semibold">
                    Max Selling Price (Rs.)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">Rs.</span>
                    <Input
                      id="max_selling_price"
                      type="number"
                      step="0.01"
                      value={formData.max_selling_price}
                      onChange={(e) => setFormData({ ...formData, max_selling_price: e.target.value })}
                      placeholder="500.00"
                      className="pl-11 h-11 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_quantity" className="text-sm font-semibold flex items-center gap-1">
                    Min Order Qty (MOQ) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="minimum_quantity"
                    type="number"
                    min="1"
                    value={formData.minimum_quantity}
                    onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })}
                    placeholder="3"
                    className="h-11 font-medium"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <Label htmlFor="status" className="text-sm font-semibold cursor-pointer">
                    Subcategory Status
                  </Label>
                  <p className="text-xs text-muted-foreground">Visible on storefront catalog</p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                />
              </div>

              {/* Discount Tiers Section */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-base font-semibold">Bulk Discount Tiers</Label>
                    <p className="text-xs text-muted-foreground">Tiered price discounts applied when customers order higher quantities</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addDiscountTier} className="h-9">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Tier
                  </Button>
                </div>
                
                {discountTiers.length === 0 ? (
                  <div className="text-center py-6 border rounded-xl border-dashed bg-muted/20 text-muted-foreground text-xs">
                    No discount tiers added. Click "Add Tier" to create quantity discounts.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discountTiers.map((tier, index) => (
                      <Card key={index} className="border-border/70 shadow-xs">
                        <CardHeader className="py-3 px-4 bg-muted/20 flex flex-row justify-between items-center">
                          <CardTitle className="text-xs font-semibold">Tier {index + 1}</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeDiscountTier(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Min Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              value={tier.min_quantity}
                              onChange={(e) => updateDiscountTier(index, 'min_quantity', parseInt(e.target.value) || 1)}
                              placeholder="5"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Max Qty (Optional)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={tier.max_quantity || ''}
                              onChange={(e) => updateDiscountTier(index, 'max_quantity', e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="Unlimited"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Discount Amount (Rs.)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={tier.discount_amount}
                              onChange={(e) => updateDiscountTier(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                              placeholder="50.00"
                              className="h-9 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-9 px-4 text-xs font-bold rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500/60 shadow-2xs active:scale-95 transition-all backdrop-blur-md"
                >
                  Cancel
                </Button>
                <ButtonColorful type="submit" className="h-9 px-6 text-xs">
                  {editingSubcategory ? 'Update Subcategory' : 'Create Subcategory'}
                </ButtonColorful>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subcategories.map((subcategory) => (
          <SubcategoryCard 
            key={subcategory.id} 
            subcategory={subcategory}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
      {/* Media Picker Modal */}
      <MediaPicker
        open={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        folder="subcategories"
        onSelect={(url) => {
          setImagePreview(url);
          setSelectedImage(null);
        }}
      />
    </div>
  );
}

function SubcategoryCard({ 
  subcategory, 
  onEdit, 
  onDelete 
}: { 
  subcategory: Subcategory;
  onEdit: (subcategory: Subcategory) => void;
  onDelete: (id: string) => void;
}) {
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);

  useEffect(() => {
    fetchDiscountTiers();
  }, [subcategory.id]);

  const fetchDiscountTiers = async () => {
    const { data } = await supabase
      .from('discount_tiers')
      .select('*')
      .eq('subcategory_id', subcategory.id)
      .order('min_quantity', { ascending: true });
    
    setDiscountTiers(data || []);
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
      {/* 1:1 Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {subcategory.image_url ? (
          <img 
            src={subcategory.image_url} 
            alt={subcategory.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {/* Status Badge */}
        <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
          subcategory.status === 'on' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {subcategory.status === 'on' ? 'Active' : 'Inactive'}
        </span>
        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(subcategory)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => onDelete(subcategory.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold truncate">{subcategory.name}</h3>
        <p className="text-xs text-muted-foreground">{subcategory.categories?.name}</p>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price Range:</span>
            <span className="font-medium">
              Rs.{subcategory.min_selling_price}
              {subcategory.max_selling_price && subcategory.max_selling_price !== subcategory.min_selling_price 
                ? ` - Rs.${subcategory.max_selling_price}` 
                : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">MOQ:</span>
            <span className="font-medium text-blue-600">{subcategory.minimum_quantity}</span>
          </div>
        </div>
        {discountTiers.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <span className="text-xs font-medium">Discounts:</span>
            <div className="text-xs text-green-600">
              {discountTiers.length} tier{discountTiers.length > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
