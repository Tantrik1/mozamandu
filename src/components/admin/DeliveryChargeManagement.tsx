
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, MapPin, Truck } from 'lucide-react';

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
  is_active: boolean;
  created_at: string;
}

export function DeliveryChargeManagement() {
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDeliveryCharge, setEditingDeliveryCharge] = useState<DeliveryCharge | null>(null);
  const [formData, setFormData] = useState({
    place_name: '',
    delivery_price: '',
    is_active: true,
  });

  useEffect(() => {
    fetchDeliveryCharges();
  }, []);

  const fetchDeliveryCharges = async () => {
    const { data, error } = await supabase
      .from('delivery_charges')
      .select('*')
      .order('place_name', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch delivery charges",
        variant: "destructive",
      });
    } else {
      setDeliveryCharges(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const deliveryChargeData = {
      place_name: formData.place_name,
      delivery_price: parseFloat(formData.delivery_price),
      is_active: formData.is_active,
    };

    let error;
    
    if (editingDeliveryCharge) {
      ({ error } = await supabase
        .from('delivery_charges')
        .update(deliveryChargeData)
        .eq('id', editingDeliveryCharge.id));
    } else {
      ({ error } = await supabase
        .from('delivery_charges')
        .insert([deliveryChargeData]));
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
      description: `Delivery charge ${editingDeliveryCharge ? 'updated' : 'created'} successfully`,
    });
    
    resetForm();
    setIsCreateModalOpen(false);
    fetchDeliveryCharges();
  };

  const handleEdit = (deliveryCharge: DeliveryCharge) => {
    setEditingDeliveryCharge(deliveryCharge);
    setFormData({
      place_name: deliveryCharge.place_name,
      delivery_price: deliveryCharge.delivery_price.toString(),
      is_active: deliveryCharge.is_active,
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery charge?')) return;

    const { error } = await supabase
      .from('delivery_charges')
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
        description: "Delivery charge deleted successfully",
      });
      fetchDeliveryCharges();
    }
  };

  const resetForm = () => {
    setFormData({
      place_name: '',
      delivery_price: '',
      is_active: true,
    });
    setEditingDeliveryCharge(null);
  };

  const filteredDeliveryCharges = deliveryCharges.filter(charge =>
    charge.place_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCharges = deliveryCharges.filter(charge => charge.is_active);
  const totalLocations = deliveryCharges.length;
  const averagePrice = deliveryCharges.length > 0 
    ? deliveryCharges.reduce((sum, charge) => sum + charge.delivery_price, 0) / deliveryCharges.length 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Delivery Charge Management</h2>
          <p className="text-gray-600 mt-1">Manage delivery charges for different locations</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDeliveryCharge ? 'Edit Delivery Charge' : 'Add Delivery Location'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="place_name">Location Name</Label>
                <Input
                  id="place_name"
                  value={formData.place_name}
                  onChange={(e) => setFormData({ ...formData, place_name: e.target.value })}
                  required
                  placeholder="e.g., Downtown, Suburbs, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="delivery_price">Delivery Price (Rs)</Label>
                <Input
                  id="delivery_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.delivery_price}
                  onChange={(e) => setFormData({ ...formData, delivery_price: e.target.value })}
                  required
                  placeholder="0.00"
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
                  {editingDeliveryCharge ? 'Update' : 'Add'} Location
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold">{totalLocations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Locations</p>
                <p className="text-2xl font-bold">{activeCharges.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <span className="text-orange-600 font-bold text-lg">Rs</span>
              <div>
                <p className="text-sm text-gray-600">Average Price</p>
                <p className="text-2xl font-bold">{averagePrice.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredDeliveryCharges.length} of {deliveryCharges.length} locations
        </div>
      </div>

      {filteredDeliveryCharges.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No delivery locations found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Add your first delivery location to get started'}
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Delivery Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveryCharges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">{charge.place_name}</TableCell>
                    <TableCell>Rs {charge.delivery_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={charge.is_active ? 'default' : 'secondary'}>
                        {charge.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(charge.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(charge)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(charge.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
