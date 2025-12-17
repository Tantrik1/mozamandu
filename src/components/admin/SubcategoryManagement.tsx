
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, X, Upload, Package } from 'lucide-react';

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
      setSubcategories(data || []);
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

  const fetchDiscountTiers = async (subcategoryId: string) => {
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
    return data || [];
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Error",
          description: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 2MB`,
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { prepareImageForUpload } = await import('@/utils/imageOptimizer');
      
      // Optimize image (converts to WebP and compresses)
      const { file: optimizedFile } = await prepareImageForUpload(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        quality: 0.85,
      });

      const fileName = `${Math.random()}.webp`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('subcategory-images')
        .upload(filePath, optimizedFile, {
          contentType: 'image/webp',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('subcategory-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
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
    
    let imageUrl = editingSubcategory?.image_url || null;
    
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
    if (subcategoryId && discountTiers.length > 0) {
      // Delete existing tiers if editing
      if (editingSubcategory) {
        await supabase
          .from('discount_tiers')
          .delete()
          .eq('subcategory_id', subcategoryId);
      }

      // Insert new tiers
      const tiersToInsert = discountTiers.map(tier => ({
        subcategory_id: subcategoryId,
        min_quantity: tier.min_quantity,
        max_quantity: tier.max_quantity,
        discount_amount: tier.discount_amount
      }));

      const { error: tiersError } = await supabase
        .from('discount_tiers')
        .insert(tiersToInsert);

      if (tiersError) {
        toast({
          title: "Warning",
          description: "Subcategory saved but discount tiers failed to save",
          variant: "destructive",
        });
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
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcategory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSubcategory ? 'Edit Subcategory' : 'Create Subcategory'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Subcategory Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
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
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="image">Subcategory Image</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                  />
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
                {imagePreview && (
                  <div className="mt-2">
                    <div className="relative w-32 aspect-square rounded-lg border overflow-hidden bg-muted">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="min_selling_price">Min Selling Price (Rs.)</Label>
                  <Input
                    id="min_selling_price"
                    type="number"
                    step="0.01"
                    value={formData.min_selling_price}
                    onChange={(e) => setFormData({ ...formData, min_selling_price: e.target.value })}
                    placeholder="e.g., 100"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default price for products without selling price
                  </p>
                </div>
                <div>
                  <Label htmlFor="max_selling_price">Max Selling Price (Rs.)</Label>
                  <Input
                    id="max_selling_price"
                    type="number"
                    step="0.01"
                    value={formData.max_selling_price}
                    onChange={(e) => setFormData({ ...formData, max_selling_price: e.target.value })}
                    placeholder="e.g., 500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum price in this subcategory (optional)
                  </p>
                </div>
                <div>
                  <Label htmlFor="minimum_quantity">Minimum Order Quantity (MOQ)</Label>
                  <Input
                    id="minimum_quantity"
                    type="number"
                    min="1"
                    value={formData.minimum_quantity}
                    onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })}
                    placeholder="e.g., 3"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum items required for checkout
                  </p>
                </div>
              </div>

              {/* Discount Tiers Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Discount Tiers (Separate from MOQ)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addDiscountTier}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Discount Tier
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Discount tiers are separate from the minimum order quantity above. Customers must meet the MOQ to checkout, 
                  but can get discounts based on these tiers. The discount applies to ALL items when the tier quantity is reached.
                </p>
                
                {discountTiers.map((tier, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm">Discount Tier {index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDiscountTier(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label>Min Qty for Discount</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.min_quantity}
                            onChange={(e) => updateDiscountTier(index, 'min_quantity', parseInt(e.target.value) || 1)}
                            placeholder="e.g., 5"
                          />
                        </div>
                        <div>
                          <Label>Max Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.max_quantity || ''}
                            onChange={(e) => updateDiscountTier(index, 'max_quantity', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="No limit"
                          />
                        </div>
                        <div>
                          <Label>Discount ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tier.discount_amount}
                            onChange={(e) => updateDiscountTier(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                            placeholder="e.g., 2"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quantities {tier.min_quantity} {tier.max_quantity ? `to ${tier.max_quantity}` : 'and above'}: 
                        ${tier.discount_amount} discount per item
                      </p>
                    </CardContent>
                  </Card>
                ))}
                
                {discountTiers.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No discount tiers added. Click "Add Discount Tier" to create quantity-based discounts.
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                />
                <Label htmlFor="status">Active</Label>
              </div>
              
              <Button type="submit" className="w-full">
                {editingSubcategory ? 'Update' : 'Create'} Subcategory
              </Button>
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
