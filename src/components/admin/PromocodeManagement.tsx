
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
  discount_type: string;
  minimum_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  used_count: number;
  created_at: string;
}

export function PromocodeManagement() {
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPromocode, setEditingPromocode] = useState<Promocode | null>(null);
  const [promoUsageData, setPromoUsageData] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_percentage: 0,
    minimum_order_amount: 0,
    max_discount: null as number | null,
    usage_limit: null as number | null,
    is_active: true,
    valid_from: '',
    valid_until: '',
  });

  // Calculate accurate stats using frontend data
  const activePromocodes = promocodes.filter(p => p.is_active).length;
  const totalUsage = Object.values(promoUsageData).reduce((sum, count) => sum + count, 0);
  const averageDiscount = promocodes.length > 0 
    ? promocodes.reduce((sum, p) => sum + p.discount_percentage, 0) / promocodes.length 
    : 0;

  useEffect(() => {
    fetchPromocodesAndUsage();
  }, []);

  const fetchPromocodesAndUsage = async () => {
    setLoading(true);
    console.log('🔍 Fetching promocodes and calculating usage...');
    
    try {
      // Fetch promocodes
      const { data: promoData, error: promoError } = await supabase
        .from('promocodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (promoError) {
        console.error('❌ Promocode fetch error:', promoError);
        toast({
          title: "Error",
          description: "Failed to fetch promocodes: " + promoError.message,
          variant: "destructive",
        });
        return;
      }

      const promocodesList = promoData || [];
      console.log(`📋 Fetched ${promocodesList.length} promocodes`);

      // Fetch ALL orders from both tables to calculate promo usage
      console.log('📊 Fetching all orders for promo usage calculation...');
      const [customerOrdersResult, ordersResult] = await Promise.all([
        supabase
          .from('customer_orders')
          .select('promocode_used')
          .not('promocode_used', 'is', null)
          .neq('promocode_used', ''),
        supabase
          .from('orders')
          .select('promocode_used')
          .not('promocode_used', 'is', null)
          .neq('promocode_used', '')
      ]);

      let allPromosUsed: string[] = [];
      
      if (!customerOrdersResult.error && customerOrdersResult.data) {
        allPromosUsed = [...allPromosUsed, ...customerOrdersResult.data.map(order => order.promocode_used).filter(Boolean)];
      }
      
      if (!ordersResult.error && ordersResult.data) {
        allPromosUsed = [...allPromosUsed, ...ordersResult.data.map(order => order.promocode_used).filter(Boolean)];
      }

      console.log(`💰 Found ${allPromosUsed.length} total promo code usages`);

      // Calculate usage count for each promo code
      const usageMap: { [key: string]: number } = {};
      promocodesList.forEach(promo => {
        const usageCount = allPromosUsed.filter(usedCode => 
          usedCode && usedCode.toUpperCase() === promo.code.toUpperCase()
        ).length;
        usageMap[promo.code] = usageCount;
        
        console.log(`📈 Promo "${promo.code}": ${usageCount} uses`);
      });

      console.log('✅ Promo usage calculation complete:', usageMap);
      
      setPromocodes(promocodesList);
      setPromoUsageData(usageMap);
      
    } catch (error) {
      console.error('❌ Error in fetchPromocodesAndUsage:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const promocodeData = {
      code: formData.code.toUpperCase(),
      description: formData.description,
      discount_type: formData.discount_type,
      discount_percentage: formData.discount_percentage,
      minimum_order_amount: formData.minimum_order_amount,
      max_discount: formData.max_discount || null,
      usage_limit: formData.usage_limit || null,
      is_active: formData.is_active,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
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
    fetchPromocodesAndUsage();
  };

  const handleEdit = (promocode: Promocode) => {
    setEditingPromocode(promocode);
    setFormData({
      code: promocode.code,
      description: promocode.description || '',
      discount_type: promocode.discount_type || 'percentage',
      discount_percentage: promocode.discount_percentage,
      minimum_order_amount: promocode.minimum_order_amount || 0,
      max_discount: promocode.max_discount,
      usage_limit: promocode.usage_limit,
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
      fetchPromocodesAndUsage(); // Refresh data with usage calculation
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_percentage: 0,
      minimum_order_amount: 0,
      max_discount: null,
      usage_limit: null,
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
          <span>Loading promocodes and calculating usage...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Promocode Management</h2>
          <p className="text-muted-foreground mt-1">Manage discount codes (Usage calculated from all orders)</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
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
                  <Label htmlFor="discount_type">Discount Type *</Label>
                  <select
                    id="discount_type"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rs.)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_percentage">
                    {formData.discount_type === 'fixed' ? 'Discount Amount (Rs.) *' : 'Discount Percentage (%) *'}
                  </Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                    required
                    placeholder={formData.discount_type === 'fixed' ? 'Enter discount amount' : 'Enter discount percentage'}
                  />
                </div>

                <div>
                  <Label htmlFor="max_discount">Max Discount (Rs.)</Label>
                  <Input
                    id="max_discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.max_discount || ''}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Optional cap on discount"
                    disabled={formData.discount_type === 'fixed'}
                  />
                  {formData.discount_type === 'percentage' && (
                    <p className="text-xs text-muted-foreground mt-1">Limits max discount for percentage codes</p>
                  )}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimum_order_amount">Minimum Order Amount (Rs.)</Label>
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

                <div>
                  <Label htmlFor="usage_limit">Usage Limit</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.usage_limit || ''}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Leave empty for unlimited"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max number of times this code can be used</p>
                </div>
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
                <Button type="submit">
                  {editingPromocode ? 'Update' : 'Create'} Promocode
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Promocodes</p>
                <p className="text-2xl font-bold">{promocodes.length}</p>
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-600">{activePromocodes}</p>
              </div>
              <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Percent className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold text-violet-600">{totalUsage}</p>
              </div>
              <div className="h-10 w-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Discount</p>
                <p className="text-2xl font-bold text-amber-600">{averageDiscount.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search promocodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
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
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {promocode.discount_type === 'fixed' 
                      ? `Rs. ${promocode.discount_percentage} OFF`
                      : `${promocode.discount_percentage}% OFF`
                    }
                  </div>
                  {promocode.max_discount && promocode.discount_type !== 'fixed' && (
                    <div className="text-sm text-amber-600">
                      Max: Rs. {promocode.max_discount}
                    </div>
                  )}
                  {promocode.minimum_order_amount > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Min. order: Rs. {promocode.minimum_order_amount}
                    </div>
                  )}
                  {promocode.usage_limit && (
                    <div className="text-sm text-blue-600">
                      Limit: {promoUsageData[promocode.code] || 0}/{promocode.usage_limit} uses
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
                    <span>Used: {promoUsageData[promocode.code] || 0} times</span>
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
