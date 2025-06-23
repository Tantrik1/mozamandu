
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, Percent, Calendar, Users } from 'lucide-react';

interface Promocode {
  id: string;
  code: string;
  description: string;
  discount_percentage: number;
  minimum_order_amount: number;
  maximum_discount_amount: number | null;
  valid_from: string;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export function PromocodeManagement() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPromocode, setEditingPromocode] = useState<Promocode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_percentage: '',
    minimum_order_amount: '',
    maximum_discount_amount: '',
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    is_active: true,
  });

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const fetchPromocodes = async () => {
    const { data, error } = await supabase
      .from('promocodes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch promocodes",
        variant: "destructive",
      });
    } else {
      setPromocodes(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const promocodeData = {
      code: formData.code.toUpperCase(),
      description: formData.description,
      discount_percentage: parseFloat(formData.discount_percentage),
      minimum_order_amount: parseFloat(formData.minimum_order_amount) || 0,
      maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
      valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : new Date().toISOString(),
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      is_active: formData.is_active,
    };

    let error;
    
    if (editingPromocode) {
      ({ error } = await supabase
        .from('promocodes')
        .update(promocodeData)
        .eq('id', editingPromocode.id));
    } else {
      ({ error } = await supabase
        .from('promocodes')
        .insert([promocodeData]));
    }

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
      description: `Promocode ${editingPromocode ? 'updated' : 'created'} successfully`,
    });
    
    resetForm();
    setIsCreateModalOpen(false);
    fetchPromocodes();
  };

  const handleEdit = (promocode: Promocode) => {
    setEditingPromocode(promocode);
    setFormData({
      code: promocode.code,
      description: promocode.description,
      discount_percentage: promocode.discount_percentage.toString(),
      minimum_order_amount: promocode.minimum_order_amount.toString(),
      maximum_discount_amount: promocode.maximum_discount_amount?.toString() || '',
      valid_from: promocode.valid_from ? new Date(promocode.valid_from).toISOString().split('T')[0] : '',
      valid_until: promocode.valid_until ? new Date(promocode.valid_until).toISOString().split('T')[0] : '',
      usage_limit: promocode.usage_limit?.toString() || '',
      is_active: promocode.is_active,
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promocode?')) return;

    const { error } = await supabase
      .from('promocodes')
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
        description: "Promocode deleted successfully",
      });
      fetchPromocodes();
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_percentage: '',
      minimum_order_amount: '',
      maximum_discount_amount: '',
      valid_from: '',
      valid_until: '',
      usage_limit: '',
      is_active: true,
    });
    setEditingPromocode(null);
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isUsageLimitReached = (usageLimit: number | null, usedCount: number) => {
    if (!usageLimit) return false;
    return usedCount >= usageLimit;
  };

  const filteredPromocodes = promocodes.filter(promocode =>
    promocode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promocode.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Promocode Management</h2>
          <p className="text-gray-600 mt-1">Create and manage discount codes for your customers</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Promocode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPromocode ? 'Edit Promocode' : 'Create Promocode'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promocode</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="SAVE20"
                  />
                </div>
                <div>
                  <Label htmlFor="discount_percentage">Discount (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    required
                    placeholder="20"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this promocode"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimum_order_amount">Minimum Order (Rs)</Label>
                  <Input
                    id="minimum_order_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="maximum_discount_amount">Max Discount (Rs)</Label>
                  <Input
                    id="maximum_discount_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maximum_discount_amount}
                    onChange={(e) => setFormData({ ...formData, maximum_discount_amount: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <Label htmlFor="usage_limit">Usage Limit</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Leave empty for unlimited"
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
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPromocode ? 'Update' : 'Create'} Promocode
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
            placeholder="Search promocodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredPromocodes.length} of {promocodes.length} promocodes
        </div>
      </div>

      {filteredPromocodes.length === 0 ? (
        <div className="text-center py-12">
          <Percent className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No promocodes found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first promocode to start offering discounts'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromocodes.map((promocode) => {
            const expired = isExpired(promocode.valid_until);
            const usageLimitReached = isUsageLimitReached(promocode.usage_limit, promocode.used_count);
            
            return (
              <Card key={promocode.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-lg font-bold font-mono bg-gray-100 px-2 py-1 rounded">
                          {promocode.code}
                        </CardTitle>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {promocode.discount_percentage}% OFF
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={promocode.is_active ? 'default' : 'secondary'}>
                          {promocode.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {expired && <Badge variant="destructive">Expired</Badge>}
                        {usageLimitReached && <Badge variant="destructive">Limit Reached</Badge>}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(promocode)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(promocode.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {promocode.description && (
                    <p className="text-gray-600 text-sm">{promocode.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {promocode.minimum_order_amount > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Min order:</span>
                        <span className="font-medium">Rs {promocode.minimum_order_amount}</span>
                      </div>
                    )}
                    
                    {promocode.maximum_discount_amount && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Max discount:</span>
                        <span className="font-medium">Rs {promocode.maximum_discount_amount}</span>
                      </div>
                    )}
                    
                    {promocode.valid_until && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Expires:</span>
                        <span className={expired ? 'text-red-600 font-medium' : ''}>
                          {new Date(promocode.valid_until).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Used:</span>
                      <span className="font-medium">
                        {promocode.used_count}
                        {promocode.usage_limit && ` / ${promocode.usage_limit}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
