import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Palette, Ruler, Plus, Package } from 'lucide-react';

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
  imageFile?: File;
  has_sizes: boolean;
  stock_quantity: number;
  sizes: SizeVariant[];
}

interface SizeVariant {
  id?: string;
  size_name: string;
  size_code: string;
  stock_quantity: number;
}

interface Product {
  id?: string;
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
  stock_quantity: number;
}

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  subcategories: Subcategory[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, categories, subcategories, onSuccess, onCancel }: ProductFormProps) {
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    subcategory_id: product?.subcategory_id || '',
    cost_price: product?.cost_price?.toString() || '',
    selling_price: product?.selling_price?.toString() || '',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    is_featured: product?.is_featured || false,
    has_color_variants: product?.has_color_variants || false,
    has_size_variants: product?.has_size_variants || false,
    status: product ? product.status === 'active' : true,
  });

  const handleCategoryChange = (categoryId: string) => {
    const filtered = subcategories.filter(sub => sub.category_id === categoryId);
    setFilteredSubcategories(filtered);
    setFormData({ ...formData, category_id: categoryId, subcategory_id: '' });
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

  const handleColorImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newVariants = [...colorVariants];
      newVariants[index].imageFile = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
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

  const removeColorImage = (index: number) => {
    const newVariants = [...colorVariants];
    newVariants[index].imageFile = undefined;
    newVariants[index].image_url = '';
    setColorVariants(newVariants);
    
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = '';
    }
  };

  const createProductFolder = (productName: string) => {
    return productName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  };

  const uploadImage = async (file: File, folderPath: string, fileName: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fullFileName = `${fileName}.${fileExt}`;
      const filePath = `${folderPath}/${fullFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');
    console.log('Form data:', formData);
    console.log('Color variants:', colorVariants);
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category_id || !formData.subcategory_id) {
      toast({
        title: "Error",
        description: "Please select both category and subcategory",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cost_price || isNaN(parseFloat(formData.cost_price))) {
      toast({
        title: "Error",
        description: "Valid cost price is required",
        variant: "destructive",
      });
      return;
    }

    // Validate stock quantities based on variant settings
    if (!formData.has_color_variants && (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0)) {
      toast({
        title: "Error",
        description: "Valid stock quantity is required for products without variants",
        variant: "destructive",
      });
      return;
    }

    if (formData.has_color_variants && colorVariants.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one color variant",
        variant: "destructive",
      });
      return;
    }

    // Validate color variants
    for (const variant of colorVariants) {
      if (!variant.color_name.trim()) {
        toast({
          title: "Error",
          description: "All color variants must have a name",
          variant: "destructive",
        });
        return;
      }
      
      if (variant.has_sizes && variant.sizes.length === 0) {
        toast({
          title: "Error",
          description: `Color variant "${variant.color_name}" has sizes enabled but no sizes defined`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsUploading(true);

    try {
      const productFolder = createProductFolder(formData.name);
      let mainImageUrl = product?.image_url || '';
      
      // Upload main product image
      if (imageFile) {
        console.log('Uploading main image...');
        const uploadedImageUrl = await uploadImage(imageFile, productFolder, 'main');
        if (uploadedImageUrl) {
          mainImageUrl = uploadedImageUrl;
          console.log('Main image uploaded:', mainImageUrl);
        } else {
          toast({
            title: "Error",
            description: "Failed to upload main image",
            variant: "destructive",
          });
          return;
        }
      }
      
      const productData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        cost_price: parseFloat(formData.cost_price),
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        is_featured: formData.is_featured,
        has_color_variants: formData.has_color_variants,
        has_size_variants: formData.has_size_variants,
        status: formData.status ? 'active' : 'inactive' as 'active' | 'inactive',
        image_url: mainImageUrl,
        stock_quantity: formData.has_color_variants ? 0 : parseInt(formData.stock_quantity),
      };

      console.log('Saving product data:', productData);

      let error;
      let productId;
      
      if (product?.id) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        error = updateError;
        productId = product.id;
        console.log('Product updated, ID:', productId);
      } else {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select('id')
          .single();
        error = insertError;
        productId = data?.id;
        console.log('Product created, ID:', productId);
      }

      if (error) {
        console.error('Product save error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save product",
          variant: "destructive",
        });
        return;
      }

      // Save main product image to product_images table
      if (mainImageUrl && productId) {
        console.log('Saving main image to product_images table...');
        const { error: imageError } = await supabase
          .from('product_images')
          .upsert({
            product_id: productId,
            image_url: mainImageUrl,
            image_type: 'main',
            storage_path: `${productFolder}/main`,
            is_primary: true
          });
        
        if (imageError) {
          console.error('Error saving main image:', imageError);
        }
      }

      // Handle color variants if enabled
      if (formData.has_color_variants && colorVariants.length > 0 && productId) {
        console.log('Processing color variants...');
        
        // Delete existing variants if updating
        if (product?.id) {
          console.log('Deleting existing color variants...');
          const { error: deleteError } = await supabase
            .from('color_variants')
            .delete()
            .eq('product_id', productId);
          
          if (deleteError) {
            console.error('Error deleting existing variants:', deleteError);
          }
        }

        for (const [index, variant] of colorVariants.entries()) {
          if (variant.color_name.trim()) {
            console.log(`Processing color variant ${index + 1}:`, variant.color_name);
            
            let variantImageUrl = '';
            
            // Upload color variant image
            if (variant.imageFile) {
              console.log('Uploading color variant image...');
              const colorFolder = `${productFolder}/colors`;
              const colorFileName = variant.color_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
              variantImageUrl = await uploadImage(variant.imageFile, colorFolder, colorFileName) || '';
              console.log('Color variant image uploaded:', variantImageUrl);
            }

            const colorVariantData = {
              product_id: productId,
              color_name: variant.color_name.trim(),
              image_url: variantImageUrl || null,
              has_sizes: variant.has_sizes,
              stock_quantity: variant.has_sizes ? 0 : variant.stock_quantity
            };

            console.log('Saving color variant:', colorVariantData);

            const { data: colorVariantResult, error: colorError } = await supabase
              .from('color_variants')
              .insert(colorVariantData)
              .select('id')
              .single();

            if (colorError) {
              console.error('Error creating color variant:', colorError);
              toast({
                title: "Error",
                description: `Failed to save color variant: ${variant.color_name}`,
                variant: "destructive",
              });
              continue;
            }

            console.log('Color variant saved with ID:', colorVariantResult?.id);

            // Save variant image to product_images table
            if (variantImageUrl && colorVariantResult?.id) {
              console.log('Saving color variant image to product_images table...');
              const { error: variantImageError } = await supabase
                .from('product_images')
                .insert({
                  product_id: productId,
                  color_variant_id: colorVariantResult.id,
                  image_url: variantImageUrl,
                  image_type: 'variant',
                  storage_path: `${productFolder}/colors/${variant.color_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  is_primary: false
                });

              if (variantImageError) {
                console.error('Error saving variant image:', variantImageError);
              }
            }

            // Handle sizes if variant has sizes
            if (variant.has_sizes && variant.sizes.length > 0 && colorVariantResult?.id) {
              console.log('Processing size variants for color:', variant.color_name);
              
              const sizeInserts = variant.sizes
                .filter(size => size.size_name.trim())
                .map(size => ({
                  color_variant_id: colorVariantResult.id,
                  size_name: size.size_name.trim(),
                  size_code: size.size_code.trim() || size.size_name.trim(),
                  stock_quantity: size.stock_quantity
                }));

              console.log('Size variants to insert:', sizeInserts);

              if (sizeInserts.length > 0) {
                const { error: sizeError } = await supabase
                  .from('size_variants')
                  .insert(sizeInserts);

                if (sizeError) {
                  console.error('Error creating size variants:', sizeError);
                  toast({
                    title: "Warning",
                    description: `Some size variants for ${variant.color_name} could not be saved`,
                    variant: "destructive",
                  });
                } else {
                  console.log(`${sizeInserts.length} size variants saved for ${variant.color_name}`);
                }
              }
            }
          }
        }
      }

      console.log('Product submission completed successfully');
      toast({
        title: "Success",
        description: `Product ${product ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const addColorVariant = () => {
    setColorVariants([...colorVariants, {
      color_name: '',
      has_sizes: false,
      stock_quantity: 0,
      sizes: []
    }]);
  };

  const removeColorVariant = (index: number) => {
    const newVariants = colorVariants.filter((_, i) => i !== index);
    setColorVariants(newVariants);
    delete fileInputRefs.current[index];
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

  const addSize = (variantIndex: number) => {
    const newVariants = [...colorVariants];
    newVariants[variantIndex].sizes.push({
      size_name: '',
      size_code: '',
      stock_quantity: 0
    });
    setColorVariants(newVariants);
  };

  const removeSize = (variantIndex: number, sizeIndex: number) => {
    const newVariants = [...colorVariants];
    newVariants[variantIndex].sizes.splice(sizeIndex, 1);
    setColorVariants(newVariants);
  };

  const updateSize = (variantIndex: number, sizeIndex: number, field: keyof SizeVariant, value: any) => {
    const newVariants = [...colorVariants];
    (newVariants[variantIndex].sizes[sizeIndex] as any)[field] = value;
    setColorVariants(newVariants);
  };

  // Initialize filtered subcategories when form loads
  React.useEffect(() => {
    if (formData.category_id) {
      const filtered = subcategories.filter(sub => sub.category_id === formData.category_id);
      setFilteredSubcategories(filtered);
    }
  }, [formData.category_id, subcategories]);

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="variants">Variants & Stock</TabsTrigger>
      </TabsList>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={handleCategoryChange}
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
            <Label htmlFor="subcategory">Subcategory *</Label>
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
            <Label>Main Product Image</Label>
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
                      <span className="text-blue-600 hover:text-blue-500">Upload main image</span>
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
              <Label htmlFor="cost_price">Cost Price ($) *</Label>
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

          {!formData.has_color_variants && (
            <div>
              <Label htmlFor="stock_quantity" className="flex items-center">
                <Package className="h-4 w-4 mr-1" />
                Stock Quantity *
              </Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
              />
            </div>
          )}
          
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
                        <Label>Color Name *</Label>
                        <Input
                          value={variant.color_name}
                          onChange={(e) => updateColorVariant(index, 'color_name', e.target.value)}
                          placeholder="e.g., Red, Blue, Green"
                          required
                        />
                      </div>
                      {!variant.has_sizes && (
                        <div>
                          <Label className="flex items-center">
                            <Package className="h-4 w-4 mr-1" />
                            Stock Quantity
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stock_quantity}
                            onChange={(e) => updateColorVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Color Image</Label>
                      <div className="mt-2">
                        {variant.image_url ? (
                          <div className="relative inline-block">
                            <img 
                              src={variant.image_url} 
                              alt={`${variant.color_name} preview`} 
                              className="w-24 h-24 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 rounded-full w-5 h-5 p-0"
                              onClick={() => removeColorImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center w-24 h-24 flex items-center justify-center">
                            <div>
                              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                              <Label htmlFor={`color-image-${index}`} className="cursor-pointer">
                                <span className="text-xs text-blue-600">Upload</span>
                                <Input
                                  ref={(el) => fileInputRefs.current[index] = el}
                                  id={`color-image-${index}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleColorImageChange(index, e)}
                                  className="hidden"
                                />
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={variant.has_sizes}
                        onCheckedChange={(checked) => {
                          updateColorVariant(index, 'has_sizes', checked);
                          if (!checked) {
                            updateColorVariant(index, 'sizes', []);
                          }
                        }}
                      />
                      <Label className="flex items-center">
                        <Ruler className="h-4 w-4 mr-1" />
                        Has Sizes
                      </Label>
                    </div>

                    {variant.has_sizes && (
                      <div>
                        <Label>Size Variants</Label>
                        <div className="space-y-2 mt-2">
                          {variant.sizes.map((size, sizeIndex) => (
                            <div key={sizeIndex} className="grid grid-cols-4 gap-2 items-end">
                              <div>
                                <Label className="text-xs">Size Name</Label>
                                <Input
                                  placeholder="S, M, L, XL"
                                  value={size.size_name}
                                  onChange={(e) => updateSize(index, sizeIndex, 'size_name', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Size Code</Label>
                                <Input
                                  placeholder="Code"
                                  value={size.size_code}
                                  onChange={(e) => updateSize(index, sizeIndex, 'size_code', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs flex items-center">
                                  <Package className="h-3 w-3 mr-1" />
                                  Stock
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={size.stock_quantity}
                                  onChange={(e) => updateSize(index, sizeIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSize(index, sizeIndex)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addSize(index)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Size
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
        
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isUploading}>
            {isUploading ? 'Saving...' : product ? 'Update' : 'Create'} Product
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Tabs>
  );
}
