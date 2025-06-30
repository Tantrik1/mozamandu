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
import { Plus, Edit, Trash2, Search, Percent, Calendar, DollarSign, Tag } from 'lucide-react';

interface Promocode {
  id: string;
  code: string;
  description: string;
  discount_percentage: number;
  minimum_order_amount: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  used_count: number;
  created_at: string;
}

async function getPromoCodeUsageCount(code: string): Promise<number> {
  const upperCode = code.toUpperCase();

  // Count in orders table
  const { count: ordersCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .ilike('promocode_used', upperCode);

  // Count in customer_orders table
  const { count: customerOrdersCount } = await supabase
    .from('customer_orders')
    .select('id', { count: 'exact', head: true })
    .ilike('promocode_used', upperCode);

  return (ordersCount || 0) + (customerOrdersCount || 0);
}

export function PromocodeManagement() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPromocode, setEditingPromocode] = useState<Promocode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_percentage: 0,
    minimum_order_amount: 0,
    is_active: true,
    valid_from: '',
    valid_until: '',
  });
  const [promoUsage, setPromoUsage] = useState<{ [code: string]: number }>({});

  // Stats
  const activePromocodes = promocodes.filter(p => p.is_active).length;
  const totalUsage = Object.values(promoUsage).reduce((sum, count) => sum + count, 0);
  const averageDiscount = promocodes.length > 0
    ? promocodes.reduce((sum, p) => sum + p.discount_percentage, 0) / promocodes.length
    : 0;

  useEffect(() => {
    fetchPromocodes();
  }, []);

  useEffect(() => {
    async function fetchUsage() {
      const usage: { [code: string]: number } = {};
      for (const promo of promocodes) {
        usage[promo.code] = await getPromoCodeUsageCount(promo.code);
      }
      setPromoUsage(usage);
    }
    if (promocodes.length) fetchUsage();
  }, [promocodes]);

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
      discount_percentage: formData.discount_percentage,
      minimum_order_amount: formData.minimum_order_amount,
      is_active: formData.is_active,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until,
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
      description: promocode.description || '',
      discount_percentage: promocode.discount_percentage,
      minimum_order_amount: promocode.minimum_order_amount || 0,
      is_active: promocode.is_active,
      valid_from: promocode.valid_from ? new Date(promocode.valid_from).toISOString().split('T')[0] : '',
      valid_until: promocode.valid_until ? new Date(promocode.valid_until).toISOString().split('T')[0] : '',
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
      discount_percentage: 0,
      minimum_order_amount: 0,
      is_active: true,
      valid_from: '',
      valid_until: '',
    });
    setEditingPromocode(null);
  };

  const filteredPromocodes = promocodes.filter(promocode =>
    promocode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (promocode.description && promocode.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isExpired = (validUntil: string) => {
    return validUntil && new Date(validUntil) < new Date();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Promocode Management</h2>
          <p className="text-gray-600 mt-1">Manage discount codes and promotional offers</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Promocode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingPromocode ? 'Edit Promocode' : 'Create New Promocode'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promocode *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="Enter promocode"
                    className="uppercase"
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
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                    required
                    placeholder="Enter discount percentage"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter promocode description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="minimum_order_amount">Minimum Order Amount</Label>
                <Input
                  id="minimum_order_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimum_order_amount}
                  onChange={(e) => setFormData({ ...formData, minimum_order_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter minimum order amount"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingPromocode ? 'Update' : 'Create'} Promocode
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Promocodes</p>
                <p className="text-2xl font-bold text-gray-900">{promocodes.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Tag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Promocodes</p>
                <p className="text-2xl font-bold text-green-600">{activePromocodes}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Percent className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold text-purple-600">{totalUsage}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Discount</p>
                <p className="text-2xl font-bold text-orange-600">{averageDiscount.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Percent className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search promocodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          {filteredPromocodes.length} of {promocodes.length} promocodes
        </div>
      </div>

      {/* Promocodes Grid */}
      {filteredPromocodes.length === 0 ? (
        <div className="text-center py-12">
          <Percent className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No promocodes found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first promocode'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromocodes.map((promocode) => (
            <Card key={promocode.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold text-blue-600">{promocode.code}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={promocode.is_active ? 'default' : 'secondary'}
                        className={promocode.is_active ? 'bg-green-100 text-green-800' : ''}
                      >
                        {promocode.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {promocode.valid_until && isExpired(promocode.valid_until) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(promocode)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(promocode.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{promocode.discount_percentage}% OFF</div>
                  {promocode.minimum_order_amount > 0 && (
                    <div className="text-sm text-gray-600">
                      Min. order: ${promocode.minimum_order_amount}
                    </div>
                  )}
                </div>

                {promocode.description && (
                  <p className="text-gray-600 text-sm">{promocode.description}</p>
                )}

                <div className="space-y-2 text-sm text-gray-500">
                  {promocode.valid_from && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>From: {new Date(promocode.valid_from).toLocaleDateString()}</span>
                    </div>
                  )}
                  {promocode.valid_until && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Until: {new Date(promocode.valid_until).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Used: {promoUsage[promocode.code] || 0} times</span>
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-gray-500">
                  Created: {new Date(promocode.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
