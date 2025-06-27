
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

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
        .order('display_order');

      if (error) throw error;
      setNavbarItems(data || []);
    } catch (error) {
      console.error('Error fetching navbar items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch navbar items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = (itemId: string, isVisible: boolean) => {
    setNavbarItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, is_visible: isVisible } : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = navbarItems.map(item => ({
        id: item.id,
        is_visible: item.is_visible
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('navbar_items')
          .update({ is_visible: update.is_visible })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Navbar settings updated successfully"
      });
    } catch (error) {
      console.error('Error updating navbar items:', error);
      toast({
        title: "Error",
        description: "Failed to update navbar settings",
        variant: "destructive"
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
        return item.category?.name || 'Unknown Category';
      default:
        return item.item_type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Navbar Management</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {navbarItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={item.id}
                  checked={item.is_visible}
                  onCheckedChange={(checked) => 
                    handleToggleVisibility(item.id, checked as boolean)
                  }
                />
                <label
                  htmlFor={item.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                >
                  {getItemLabel(item)}
                </label>
                <span className="text-xs text-gray-500">
                  Order: {item.display_order}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
