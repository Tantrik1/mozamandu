
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Upload, X, Palette, Ruler } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  selling_price: number;
  category_id: string;
}

interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  sizes: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  cost_price: number;
  selling_price: number;
  is_featured: boolean;
  has_color_variants: boolean;
  has_size_variants: boolean;
  status: 'active' | 'inactive';
  category_id: string;
  subcategory_id: string;
  image_url: string;
  categories: { name: string };
  subcategories: { name: string; selling_price: number };
  created_at: string;
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    cost_price: '',
    selling_price: '',
    is_featured: false,
    has_color_variants: false,
    has_size_variants: false,
    status: true,
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    if (formData.category_id) {
      const filtered = subcategories.filter(sub => sub.category_id === formData.category_id);
      setFilteredSubcategories(filtered);
    } else {
      setFilteredSubcategories([]);
    }
  }, [formData.category_id, subcategories]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (name),
        subcategories (name, selling_price)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
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

  const fetchSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name, selling_price, category_id')
      .eq('status', 'on');

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newVariants = [...colorVariants];
        newVariants[index].image_url = e.target?.result as string;
        setColorVariants(newVariants);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const addColorVariant = () => {
    setColorVariants([...colorVariants, {
      color_name: '',
      has_sizes: false,
      sizes: []
    }]);
  };

  const removeColorVariant = (index: number) => {
    const newVariants = colorVariants.filter((_, i) => i !== index);
    setColorVariants(newVariants);
  };

  const updateColorVariant = (index: number, field: keyof ColorVariant, value: any) => {
    const newVariants = [...colorVariants];
    if (field === 'sizes') {
      newVariants[index][field] = value;
    } else {
      (newVariants[index] as any)[field] = value;
    }
    setColorVariants(newVariants);
  };

  const addSize = (variantIndex: number, size: string) => {
    if (size.trim()) {
      const newVariants = [...colorVariants];
      newVariants[variantIndex].sizes.push(size.trim());
      setColorVariants(newVariants);
    }
  };

  const removeSize = (variantIndex: number, sizeIndex: number) => {
    const newVariants = [...colorVariants];
    newVariants[variantIndex].sizes.splice(sizeIndex, 1);
    setColorVariants(newVariants);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setIsUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile);

    setIsUploading(false);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = editingProduct?.image_url || '';
    
    if (imageFile) {
      const uploadedImageUrl = await uploadImage();
      if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
      } else {
        return;
      }
    }
    
    const productData = {
      name: formData.name,
      description: formData.description,
      category_id: formData.category_id,
      subcategory_id: formData.subcategory_id,
      cost_price: parseFloat(formData.cost_price),
      selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
      is_featured: formData.is_featured,
      has_color_variants: formData.has_color_variants,
      has_size_variants: formData.has_size_variants,
      status: formData.status ? 'active' : 'inactive' as 'active' | 'inactive',
      image_url: imageUrl,
    };

    let error;
    let productId;
    
    if (editingProduct) {
      ({ error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id));
      productId = editingProduct.id;
    } else {
      const { data, error: insertError } = await supabase
        .from('products')
        .insert([productData])
        .select('id')
        .single();
      error = insertError;
      productId = data?.id;
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Handle color variants if enabled
    if (formData.has_color_variants && colorVariants.length > 0 && productId) {
      for (const variant of colorVariants) {
        if (variant.color_name.trim()) {
          const { data: colorVariantData, error: colorError } = await supabase
            .from('color_variants')
            .insert({
              product_id: productId,
              color_name: variant.color_name,
              image_url: variant.image_url,
              has_sizes: variant.has_sizes
            })
            .select('id')
            .single();

          if (colorError) {
            console.error('Error creating color variant:', colorError);
            continue;
          }

          // Handle sizes if variant has sizes
          if (variant.has_sizes && variant.sizes.length > 0 && colorVariantData?.id) {
            for (const size of variant.sizes) {
              await supabase
                .from('size_variants')
                .insert({
                  color_variant_id: colorVariantData.id,
                  size_name: size,
                  size_code: size
                });
            }
          }
        }
      }
    }

    toast({
      title: "Success",
      description: `Product ${editingProduct ? 'updated' : 'created'} successfully`,
    });
    
    resetForm();
    setIsCreateModalOpen(false);
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      subcategory_id: product.subcategory_id,
      cost_price: product.cost_price.toString(),
      selling_price: product.selling_price?.toString() || '',
      is_featured: product.is_featured,
      has_color_variants: product.has_color_variants,
      has_size_variants: product.has_size_variants,
      status: product.status === 'active',
    });
    if (product.image_url) {
      setImagePreview(product.image_url);
    }
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
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
        description: "Product deleted successfully",
      });
      fetchProducts();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      subcategory_id: '',
      cost_price: '',
      selling_price: '',
      is_featured: false,
      has_color_variants: false,
      has_size_variants: false,
      status: true,
    });
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('');
    setColorVariants([]);
  };

  const getProductPrice = (product: Product) => {
    return product.selling_price || product.subcategories?.selling_price || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Create Product'}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="variants">Variants</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
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
                        onValueChange={(value) => setFormData({ ...formData, category_id: value, subcategory_id: '' })}
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
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Select 
                      value={formData.subcategory_id} 
                      onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
                      disabled={!formData.category_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name} (${subcategory.selling_price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Product Image</Label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative inline-block">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-32 h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                            onClick={removeImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-2">
                            <Label htmlFor="image-upload" className="cursor-pointer">
                              <span className="text-blue-600 hover:text-blue-500">Upload an image</span>
                              <Input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost_price">Cost Price ($)</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="selling_price">Custom Selling Price ($)</Label>
                      <Input
                        id="selling_price"
                        type="number"
                        step="0.01"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                        placeholder="Leave empty to use subcategory price"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                      />
                      <Label htmlFor="is_featured">Featured Product</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="status"
                        checked={formData.status}
                        onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                      />
                      <Label htmlFor="status">Active</Label>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="variants" className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="has_color_variants"
                      checked={formData.has_color_variants}
                      onCheckedChange={(checked) => {
                        setFormData({ ...formData, has_color_variants: checked });
                        if (!checked) {
                          setColorVariants([]);
                        }
                      }}
                    />
                    <Label htmlFor="has_color_variants" className="flex items-center">
                      <Palette className="h-4 w-4 mr-1" />
                      Add Color Variants
                    </Label>
                  </div>

                  {formData.has_color_variants && (
                    <div className="space-y-4">
                      {colorVariants.map((variant, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-sm">Color Variant {index + 1}</CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeColorVariant(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Color Name</Label>
                                <Input
                                  value={variant.color_name}
                                  onChange={(e) => updateColorVariant(index, 'color_name', e.target.value)}
                                  placeholder="e.g., Red, Blue, Green"
                                />
                              </div>
                              <div>
                                <Label>Color Image</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleColorImageChange(e, index)}
                                />
                                {variant.image_url && (
                                  <img 
                                    src={variant.image_url} 
                                    alt="Color variant" 
                                    className="w-16 h-16 object-cover rounded mt-2" 
                                  />
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={variant.has_sizes}
                                onCheckedChange={(checked) => updateColorVariant(index, 'has_sizes', checked)}
                              />
                              <Label className="flex items-center">
                                <Ruler className="h-4 w-4 mr-1" />
                                Has Sizes
                              </Label>
                            </div>

                            {variant.has_sizes && (
                              <div>
                                <Label>Sizes</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {variant.sizes.map((size, sizeIndex) => (
                                    <div key={sizeIndex} className="flex items-center bg-gray-100 rounded px-2 py-1">
                                      <span className="text-sm">{size}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="ml-1 h-4 w-4 p-0"
                                        onClick={() => removeSize(index, sizeIndex)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <Input
                                    placeholder="Add size (e.g., S, M, L, XL)"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const input = e.target as HTMLInputElement;
                                        addSize(index, input.value);
                                        input.value = '';
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                      addSize(index, input.value);
                                      input.value = '';
                                    }}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addColorVariant}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Color Variant
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <Button type="submit" className="w-full" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : editingProduct ? 'Update' : 'Create'} Product
                </Button>
              </form>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-gray-500">
                    {product.categories?.name} → {product.subcategories?.name}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {product.image_url && (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
              )}
              <p className="text-gray-600 mb-3 text-sm">{product.description}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Cost Price:</span>
                  <span>${product.cost_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Selling Price:</span>
                  <span className="font-semibold text-blue-600">${getProductPrice(product)}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {product.is_featured && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                      Featured
                    </span>
                  )}
                  {product.has_color_variants && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs flex items-center">
                      <Palette className="h-3 w-3 mr-1" />
                      Colors
                    </span>
                  )}
                  {product.has_size_variants && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex items-center">
                      <Ruler className="h-3 w-3 mr-1" />
                      Sizes
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    product.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(product.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
