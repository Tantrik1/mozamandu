
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, Gift, Package, DollarSign, X } from 'lucide-react';

interface Combo {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  combo_subcategories: ComboSubcategory[];
}

interface ComboSubcategory {
  id: string;
  subcategory_id: string;
  min_units: number;
  price: number;
  subcategories: {
    name: string;
  };
}

interface Subcategory {
  id: string;
  name: string;
  selling_price: number;
}

interface ComboSubcategoryForm {
  subcategory_id: string;
  min_units: number;
  price: number;
}

export function ComboManagement() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [comboSubcategories, setComboSubcategories] = useState<ComboSubcategoryForm[]>([]);

  // Stats
  const activeCombos = combos.filter(c => c.status === 'active').length;
  const totalSubcategories = combos.reduce((sum, c) => sum + c.combo_subcategories.length, 0);
  const averagePrice = combos.length > 0 
    ? combos.reduce((sum, c) => sum + c.combo_subcategories.reduce((subSum, sub) => subSum + sub.price, 0), 0) / totalSubcategories || 0
    : 0;

  useEffect(() => {
    fetchCombos();
    fetchSubcategories();
  }, []);

  const fetchCombos = async () => {
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_subcategories (
          id,
          subcategory_id,
          min_units,
          price,
          subcategories (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch combos",
        variant: "destructive",
      });
    } else {
      // Type cast the status field to ensure proper typing
      const typedCombos = (data || []).map(combo => ({
        ...combo,
        status: combo.status as 'active' | 'inactive'
      }));
      setCombos(typedCombos);
    }
  };

  const fetchSubcategories = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name, selling_price')
      .eq('status', 'on')
      .order('name');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (comboSubcategories.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one subcategory to the combo",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate subcategories
    const subcategoryIds = comboSubcategories.map(cs => cs.subcategory_id);
    const uniqueSubcategoryIds = new Set(subcategoryIds);
    if (subcategoryIds.length !== uniqueSubcategoryIds.size) {
      toast({
        title: "Error",
        description: "Cannot add the same subcategory multiple times",
        variant: "destructive",
      });
      return;
    }

    let comboId = editingCombo?.id;
    
    if (editingCombo) {
      // Update existing combo
      const { error } = await supabase
        .from('combos')
        .update({
          name: formData.name,
          description: formData.description,
          status: formData.status,
        })
        .eq('id', editingCombo.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Delete existing combo subcategories
      await supabase
        .from('combo_subcategories')
        .delete()
        .eq('combo_id', editingCombo.id);
    } else {
      // Create new combo
      const { data: newCombo, error } = await supabase
        .from('combos')
        .insert([{
          name: formData.name,
          description: formData.description,
          status: formData.status,
        }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      comboId = newCombo.id;
    }

    // Insert combo subcategories
    const comboSubcategoryData = comboSubcategories.map(cs => ({
      combo_id: comboId,
      subcategory_id: cs.subcategory_id,
      min_units: cs.min_units,
      price: cs.price,
    }));

    const { error: subcategoryError } = await supabase
      .from('combo_subcategories')
      .insert(comboSubcategoryData);

    if (subcategoryError) {
      toast({
        title: "Error",
        description: subcategoryError.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Combo ${editingCombo ? 'updated' : 'created'} successfully`,
    });
    
    resetForm();
    setIsCreateModalOpen(false);
    fetchCombos();
  };

  const handleEdit = (combo: Combo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      status: combo.status,
    });
    setComboSubcategories(
      combo.combo_subcategories.map(cs => ({
        subcategory_id: cs.subcategory_id,
        min_units: cs.min_units,
        price: cs.price,
      }))
    );
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this combo?')) return;

    const { error } = await supabase
      .from('combos')
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
        description: "Combo deleted successfully",
      });
      fetchCombos();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
    });
    setComboSubcategories([]);
    setEditingCombo(null);
  };

  const addComboSubcategory = () => {
    setComboSubcategories([...comboSubcategories, { subcategory_id: '', min_units: 1, price: 0 }]);
  };

  const removeComboSubcategory = (index: number) => {
    setComboSubcategories(comboSubcategories.filter((_, i) => i !== index));
  };

  const updateComboSubcategory = (index: number, field: keyof ComboSubcategoryForm, value: string | number) => {
    const updated = [...comboSubcategories];
    updated[index] = { ...updated[index], [field]: value };
    setComboSubcategories(updated);
  };

  const filteredCombos = combos.filter(combo =>
    combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (combo.description && combo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Combo Management</h2>
          <p className="text-gray-600 mt-1">Create and manage product combinations</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingCombo ? 'Edit Combo' : 'Create New Combo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Combo Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter combo name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
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
                  placeholder="Enter combo description"
                  rows={3}
                />
              </div>

              {/* Combo Subcategories */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Subcategories *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addComboSubcategory}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Subcategory
                  </Button>
                </div>

                {comboSubcategories.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <Package className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No subcategories added yet</p>
                    <p className="text-sm text-gray-400">Click "Add Subcategory" to get started</p>
                  </div>
                )}

                {comboSubcategories.map((comboSubcategory, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">Subcategory {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComboSubcategory(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Subcategory *</Label>
                        <Select
                          value={comboSubcategory.subcategory_id}
                          onValueChange={(value) => updateComboSubcategory(index, 'subcategory_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                          <SelectContent>
                            {subcategories.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={subcategory.id}>
                                {subcategory.name} (${subcategory.selling_price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Minimum Units *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={comboSubcategory.min_units}
                          onChange={(e) => updateComboSubcategory(index, 'min_units', parseInt(e.target.value) || 1)}
                          placeholder="Min units"
                        />
                      </div>
                      
                      <div>
                        <Label>Price *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={comboSubcategory.price}
                          onChange={(e) => updateComboSubcategory(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {editingCombo ? 'Update' : 'Create'} Combo
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
                <p className="text-sm font-medium text-gray-600">Total Combos</p>
                <p className="text-2xl font-bold text-gray-900">{combos.length}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Gift className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Combos</p>
                <p className="text-2xl font-bold text-green-600">{activeCombos}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Subcategories</p>
                <p className="text-2xl font-bold text-blue-600">{totalSubcategories}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                <p className="text-2xl font-bold text-orange-600">${averagePrice.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search combos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          {filteredCombos.length} of {combos.length} combos
        </div>
      </div>

      {/* Combos Grid */}
      {filteredCombos.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No combos found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first combo'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCombos.map((combo) => (
            <Card key={combo.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold text-purple-600">{combo.name}</CardTitle>
                    <Badge 
                      variant={combo.status === 'active' ? 'default' : 'secondary'}
                      className={combo.status === 'active' ? 'bg-green-100 text-green-800 mt-2' : 'mt-2'}
                    >
                      {combo.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(combo)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(combo.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {combo.description && (
                  <p className="text-gray-600 text-sm">{combo.description}</p>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Subcategories ({combo.combo_subcategories.length})</h4>
                  <div className="space-y-2">
                    {combo.combo_subcategories.map((cs) => (
                      <div key={cs.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{cs.subcategories.name}</span>
                          <span className="text-green-600 font-bold">${cs.price}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Min. {cs.min_units} units required
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t text-xs text-gray-500">
                  Created: {new Date(combo.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
