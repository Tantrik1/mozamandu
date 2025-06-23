
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  status: 'on' | 'off';
  created_at: string;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: true,
  });

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
      setCategories(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryData = {
      name: formData.name,
      description: formData.description,
      status: formData.status ? 'on' : 'off' as 'on' | 'off',
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

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
      });
      
      setFormData({ name: '', description: '', status: true });
      setIsCreateModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      status: category.status === 'on',
    });
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
    setFormData({ name: '', description: '', status: true });
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Category Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
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
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">{category.description}</p>
              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded text-sm ${
                  category.status === 'on' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {category.status === 'on' ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(category.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
