import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Product, Category, Subcategory } from '@/types/product';
import { EditProductVariantForm } from './EditProductVariantForm';

interface EditProductFormProps {
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditProductForm({ product, onSuccess, onCancel }: EditProductFormProps) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [costPrice, setCostPrice] = useState(product.cost_price.toString());
  const [sellingPrice, setSellingPrice] = useState(product.selling_price?.toString() || '');
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [subcategoryId, setSubcategoryId] = useState(product.subcategory_id);
  const [isFeatured, setIsFeatured] = useState(product.is_featured);
  const [hasColorVariants, setHasColorVariants] = useState(product.has_color_variants);
  const [colorHasSizeVariants, setColorHasSizeVariants] = useState(product.color_has_size_variants);
  const [status, setStatus] = useState(product.status);
  const [imageUrl, setImageUrl] = useState(product.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    setLoading(false);
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch categories. Please try again.',
          variant: 'destructive',
        });
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch categories. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching subcategories:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch subcategories. Please try again.',
          variant: 'destructive',
        });
      } else {
        setSubcategories(data || []);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subcategories. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !costPrice || !categoryId || !subcategoryId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name,
          description,
          cost_price: parseFloat(costPrice),
          selling_price: sellingPrice ? parseFloat(sellingPrice) : null,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          is_featured: isFeatured,
          has_color_variants: hasColorVariants,
          color_has_size_variants: colorHasSizeVariants,
          status,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (error) {
        console.error('Error updating product:', error);
        toast({
          title: 'Error',
          description: 'Failed to update product. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Product updated successfully!',
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${product.id}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image:', error);
        toast({
          title: 'Error',
          description: 'Failed to upload image. Please try again.',
          variant: 'destructive',
        });
      } else {
        const { data: publicUrl } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        setImageUrl(publicUrl.publicUrl);
        toast({
          title: 'Success',
          description: 'Image uploaded successfully!',
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl('');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costPrice">Cost Price *</Label>
              <Input
                id="costPrice"
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={(value) => {
                setCategoryId(value);
                setSubcategoryId('');
                fetchSubcategories();
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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
            <div>
              <Label htmlFor="subcategory">Subcategory *</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>
              <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              <span className="ml-2">Featured</span>
            </Label>
          </div>
          <div>
            <Label>
              <Switch id="hasColorVariants" checked={hasColorVariants} onCheckedChange={setHasColorVariants} />
              <span className="ml-2">Has Color Variants</span>
            </Label>
          </div>
          {hasColorVariants && (
            <div>
              <Label>
                <Switch id="colorHasSizeVariants" checked={colorHasSizeVariants} onCheckedChange={setColorHasSizeVariants} />
                <span className="ml-2">Color Has Size Variants</span>
              </Label>
            </div>
          )}
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt={name} className="rounded-md w-64 h-64 object-cover" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-md">
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload
                      </span>
                    </>
                  )}
                  <Input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={uploadImage}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Variants Section */}
          {product.has_color_variants && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Product Variants</h3>
              <EditProductVariantForm
                product={product}
                hasColorVariants={product.has_color_variants}
                hasSizeVariants={product.color_has_size_variants}
                onVariantsChange={() => {
                  // Refresh parent component or handle variant changes
                  console.log('Variants updated');
                }}
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Product'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
