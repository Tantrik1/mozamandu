
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Color {
  id: string;
  name: string;
  hex_code?: string;
  is_active: boolean;
}

export function ColorManagement() {
  const [colors, setColors] = useState<Color[]>([]);
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [formData, setFormData] = useState({ name: '', hex_code: '' });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .order('name');

      if (error) throw error;
      setColors(data || []);
    } catch (error) {
      console.error('Error fetching colors:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch colors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingColor) {
        const { error } = await supabase
          .from('colors')
          .update({
            name: formData.name,
            hex_code: formData.hex_code || null,
          })
          .eq('id', editingColor.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Color updated successfully' });
      } else {
        const { error } = await supabase
          .from('colors')
          .insert({
            name: formData.name,
            hex_code: formData.hex_code || null,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Color created successfully' });
      }

      setFormData({ name: '', hex_code: '' });
      setIsAddingColor(false);
      setEditingColor(null);
      fetchColors();
    } catch (error) {
      console.error('Error saving color:', error);
      toast({
        title: 'Error',
        description: 'Failed to save color',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (color: Color) => {
    setEditingColor(color);
    setFormData({ name: color.name, hex_code: color.hex_code || '' });
    setIsAddingColor(true);
  };

  const handleDelete = async (colorId: string) => {
    if (!confirm('Are you sure you want to delete this color?')) return;

    try {
      const { error } = await supabase
        .from('colors')
        .update({ is_active: false })
        .eq('id', colorId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Color deactivated successfully' });
      fetchColors();
    } catch (error) {
      console.error('Error deleting color:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete color',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', hex_code: '' });
    setIsAddingColor(false);
    setEditingColor(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading colors...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Color Management</h2>
        <Button onClick={() => setIsAddingColor(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Color
        </Button>
      </div>

      {isAddingColor && (
        <Card>
          <CardHeader>
            <CardTitle>{editingColor ? 'Edit Color' : 'Add New Color'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Color Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Royal Blue"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="hex_code">Hex Code (optional)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="hex_code"
                    type="color"
                    value={formData.hex_code}
                    onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={formData.hex_code}
                    onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  {editingColor ? 'Update Color' : 'Add Color'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {colors.filter(color => color.is_active).map((color) => (
          <Card key={color.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {color.hex_code && (
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: color.hex_code }}
                    />
                  )}
                  <span className="font-medium">{color.name}</span>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              
              {color.hex_code && (
                <p className="text-sm text-gray-600 mb-3">{color.hex_code}</p>
              )}

              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(color)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDelete(color.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {colors.filter(color => color.is_active).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No colors available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
