
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, Plus } from 'lucide-react';

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
  is_active: boolean;
}

export function DeliveryChargeManagement() {
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<DeliveryCharge | null>(null);
  const [formData, setFormData] = useState({
    place_name: '',
    delivery_price: '',
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDeliveryCharges();
  }, []);

  const fetchDeliveryCharges = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_charges')
        .select('*')
        .order('place_name');

      if (error) throw error;
      setDeliveryCharges(data || []);
    } catch (error) {
      console.error('Error fetching delivery charges:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch delivery charges',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const chargeData = {
        place_name: formData.place_name,
        delivery_price: parseFloat(formData.delivery_price),
        is_active: formData.is_active,
      };

      if (editingCharge) {
        const { error } = await supabase
          .from('delivery_charges')
          .update(chargeData)
          .eq('id', editingCharge.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Delivery charge updated successfully' });
      } else {
        const { error } = await supabase
          .from('delivery_charges')
          .insert([chargeData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Delivery charge created successfully' });
      }

      fetchDeliveryCharges();
      resetForm();
    } catch (error) {
      console.error('Error saving delivery charge:', error);
      toast({
        title: 'Error',
        description: 'Failed to save delivery charge',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (charge: DeliveryCharge) => {
    setEditingCharge(charge);
    setFormData({
      place_name: charge.place_name,
      delivery_price: charge.delivery_price.toString(),
      is_active: charge.is_active,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery charge?')) return;

    try {
      const { error } = await supabase
        .from('delivery_charges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Delivery charge deleted successfully' });
      fetchDeliveryCharges();
    } catch (error) {
      console.error('Error deleting delivery charge:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete delivery charge',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      place_name: '',
      delivery_price: '',
      is_active: true,
    });
    setEditingCharge(null);
    setIsFormOpen(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading delivery charges...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Delivery Charge Management</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Delivery Charge
        </Button>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCharge ? 'Edit Delivery Charge' : 'Add New Delivery Charge'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="place_name">Place Name *</Label>
                  <Input
                    id="place_name"
                    value={formData.place_name}
                    onChange={(e) => setFormData({ ...formData, place_name: e.target.value })}
                    placeholder="Enter place name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_price">Delivery Price (Rs) *</Label>
                  <Input
                    id="delivery_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.delivery_price}
                    onChange={(e) => setFormData({ ...formData, delivery_price: e.target.value })}
                    placeholder="Enter delivery price"
                    required
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
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingCharge ? 'Update' : 'Create'} Delivery Charge
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
        {deliveryCharges.map((charge) => (
          <Card key={charge.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold">{charge.place_name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${charge.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {charge.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-600">Rs {charge.delivery_price}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(charge)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(charge.id)}
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
