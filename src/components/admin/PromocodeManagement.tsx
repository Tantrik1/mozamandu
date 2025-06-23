
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, Plus } from 'lucide-react';

interface Promocode {
  id: string;
  code: string;
  description: string | null;
  discount_percentage: number;
  minimum_order_amount: number;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export function PromocodeManagement() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromocode, setEditingPromocode] = useState<Promocode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_percentage: '',
    minimum_order_amount: '',
    maximum_discount_amount: '',
    usage_limit: '',
    is_active: true,
    valid_from: '',
    valid_until: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const fetchPromocodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromocodes(data || []);
    } catch (error) {
      console.error('Error fetching promocodes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch promocodes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const promocodeData = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_percentage: parseFloat(formData.discount_percentage),
        minimum_order_amount: parseFloat(formData.minimum_order_amount) || 0,
        maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: formData.is_active,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      if (editingPromocode) {
        const { error } = await supabase
          .from('promocodes')
          .update(promocodeData)
          .eq('id', editingPromocode.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Promocode updated successfully' });
      } else {
        const { error } = await supabase
          .from('promocodes')
          .insert([promocodeData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Promocode created successfully' });
      }

      fetchPromocodes();
      resetForm();
    } catch (error) {
      console.error('Error saving promocode:', error);
      toast({
        title: 'Error',
        description: 'Failed to save promocode',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (promocode: Promocode) => {
    setEditingPromocode(promocode);
    setFormData({
      code: promocode.code,
      description: promocode.description || '',
      discount_percentage: promocode.discount_percentage.toString(),
      minimum_order_amount: promocode.minimum_order_amount.toString(),
      maximum_discount_amount: promocode.maximum_discount_amount?.toString() || '',
      usage_limit: promocode.usage_limit?.toString() || '',
      is_active: promocode.is_active,
      valid_from: promocode.valid_from ? promocode.valid_from.split('T')[0] : '',
      valid_until: promocode.valid_until ? promocode.valid_until.split('T')[0] : '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promocode?')) return;

    try {
      const { error } = await supabase
        .from('promocodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Promocode deleted successfully' });
      fetchPromocodes();
    } catch (error) {
      console.error('Error deleting promocode:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete promocode',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_percentage: '',
      minimum_order_amount: '',
      maximum_discount_amount: '',
      usage_limit: '',
      is_active: true,
      valid_from: '',
      valid_until: '',
    });
    setEditingPromocode(null);
    setIsFormOpen(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading promocodes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Promocode Management</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Promocode
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPromocode ? 'Edit Promocode' : 'Add New Promocode'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promocode *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter promocode"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="discount_percentage">Discount Percentage (%) *</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    placeholder="Enter discount percentage"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minimum_order_amount">Minimum Order Amount (Rs)</Label>
                  <Input
                    id="minimum_order_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                    placeholder="Minimum order amount"
                  />
                </div>
                <div>
                  <Label htmlFor="maximum_discount_amount">Maximum Discount Amount (Rs)</Label>
                  <Input
                    id="maximum_discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maximum_discount_amount}
                    onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                    placeholder="Maximum discount amount"
                  />
                </div>
                <div>
                  <Label htmlFor="usage_limit">Usage Limit</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    min="1"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    placeholder="Usage limit"
                  />
                </div>
                <div>
                  <Label htmlFor="valid_from">Valid From</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingPromocode ? 'Update' : 'Create'} Promocode
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {promocodes.map((promocode) => (
          <Card key={promocode.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-lg font-bold">{promocode.code}</span>
                    <span className={`px-2 py-1 text-xs rounded ${promocode.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {promocode.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {promocode.description && (
                    <p className="text-gray-600">{promocode.description}</p>
                  )}
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Discount: {promocode.discount_percentage}%</p>
                    <p>Min Order: Rs {promocode.minimum_order_amount}</p>
                    {promocode.maximum_discount_amount && (
                      <p>Max Discount: Rs {promocode.maximum_discount_amount}</p>
                    )}
                    {promocode.usage_limit && (
                      <p>Usage: {promocode.used_count}/{promocode.usage_limit}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(promocode)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(promocode.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
