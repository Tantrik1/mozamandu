
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Menu, Eye, EyeOff } from 'lucide-react';

interface NavbarItem {
  id: string;
  item_type: string;
  category_id?: string;
  is_visible: boolean;
  display_order: number;
  category?: {
    name: string;
  };
}

export function NavbarManagement() {
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNavbarItems();
  }, []);

  const fetchNavbarItems = async () => {
    try {
      const { data, error } = await supabase
        .from('navbar_items')
        .select(`
          *,
          category:categories(name)
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setNavbarItems(data || []);
    } catch (error) {
      console.error('Error fetching navbar items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch navbar items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNavbarItem = async (id: string, is_visible: boolean) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('navbar_items')
        .update({ is_visible })
        .eq('id', id);

      if (error) throw error;

      setNavbarItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, is_visible } : item
        )
      );

      toast({
        title: "Success",
        description: "Navbar item updated successfully",
      });
    } catch (error) {
      console.error('Error updating navbar item:', error);
      toast({
        title: "Error",
        description: "Failed to update navbar item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getItemLabel = (item: NavbarItem) => {
    switch (item.item_type) {
      case 'home':
        return 'Home';
      case 'faq':
        return 'FAQ';
      case 'category':
        return item.category?.name || 'Category';
      default:
        return item.item_type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading navbar items...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Menu className="h-8 w-8" />
          Navbar Management
        </h1>
        <p className="text-gray-600 mt-2">
          Control which navigation items are visible to customers in the header menu
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {navbarItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  {item.is_visible ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <Label className="text-base font-medium">
                      {getItemLabel(item)}
                    </Label>
                    <p className="text-sm text-gray-500 capitalize">
                      {item.item_type} item
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {item.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                  <Switch
                    checked={item.is_visible}
                    onCheckedChange={(checked) => updateNavbarItem(item.id, checked)}
                    disabled={saving}
                  />
                </div>
              </div>
            ))}
          </div>

          {navbarItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No navbar items found. Items will be created automatically when categories are added.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
