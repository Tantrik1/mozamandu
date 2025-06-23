
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
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  discount_amount: number;
  minimum_quantity_for_discount: number;
  status: 'on' | 'off';
  category_id: string;
  categories: { name: string };
  created_at: string;
}

export function SubcategoryManagement() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    selling_price: '',
    discount_amount: '',
    minimum_quantity_for_discount: '1',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const subcategoryData = {
      name: formData.name,
      description: formData.description,
      category_id: formData.category_id,
      selling_price: parseFloat(formData.selling_price),
      discount_amount: parseFloat(formData.discount_amount) || 0,
      minimum_quantity_for_discount: parseInt(formData.minimum_quantity_for_discount) || 1,
      status: formData.status ? 'on' : 'off' as 'on' | 'off',
    };

    let error;
    
    if (editingSubcategory) {
      ({ error } = await supabase
        .from('subcategories')
        .update(subcategoryData)
        .eq('id', editingSubcategory.id));
    } else {
      ({ error } = await supabase
        .from('subcategories')
        .insert([subcategoryData]));
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Subcategory ${editingSubcategory ? 'updated' : 'created'} successfully`,
      });
      
      resetForm();
      setIsCreateModalOpen(false);
      fetchSubcategories();
    }
  };

  const handleEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      name: subcategory.name,
      description: subcategory.description,
      category_id: subcategory.category_id,
      selling_price: subcategory.selling_price.toString(),
      discount_amount: subcategory.discount_amount?.toString() || '0',
      minimum_quantity_for_discount: (subcategory.minimum_quantity_for_discount || 1).toString(),
      status: subcategory.status === 'on',
    });
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
      selling_price: '',
      discount_amount: '',
      minimum_quantity_for_discount: '1',
      status: true,
    });
    setEditingSubcategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Subcategory Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcategory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSubcategory ? 'Edit Subcategory' : 'Create Subcategory'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="selling_price">Selling Price ($)</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="discount_amount">Discount Amount ($)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="minimum_quantity_for_discount">Minimum Quantity for Discount</Label>
                <Input
                  id="minimum_quantity_for_discount"
                  type="number"
                  min="1"
                  value={formData.minimum_quantity_for_discount}
                  onChange={(e) => setFormData({ ...formData, minimum_quantity_for_discount: e.target.value })}
                  placeholder="e.g., 3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Discount applies only after this quantity
                </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subcategories.map((subcategory) => (
          <Card key={subcategory.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{subcategory.name}</CardTitle>
                  <p className="text-sm text-gray-500">{subcategory.categories?.name}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(subcategory)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(subcategory.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">{subcategory.description}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Selling Price:</span>
                  <span className="font-semibold">${subcategory.selling_price}</span>
                </div>
                {subcategory.discount_amount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm">Discount:</span>
                      <span className="text-green-600">
                        ${subcategory.discount_amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Min Qty for Discount:</span>
                      <span className="text-blue-600 font-medium">
                        {subcategory.minimum_quantity_for_discount || 1}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded text-sm ${
                    subcategory.status === 'on' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {subcategory.status === 'on' ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(subcategory.created_at).toLocaleDateString()}
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
