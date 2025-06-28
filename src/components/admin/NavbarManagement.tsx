
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Menu, Eye, EyeOff, RefreshCw, Plus } from 'lucide-react';

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

interface Category {
  id: string;
  name: string;
  status: string;
}

export function NavbarManagement() {
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch navbar items
      const { data: navbarData, error: navbarError } = await supabase
        .from('navbar_items')
        .select(`
          *,
          category:categories(name)
        `)
        .order('display_order', { ascending: true });

      if (navbarError) throw navbarError;

      // Fetch all active categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, status')
        .eq('status', 'on');

      if (categoriesError) throw categoriesError;

      setNavbarItems(navbarData || []);
      setCategories(categoriesData || []);
      
      // Check if any active categories are missing from navbar_items
      await syncMissingCategories(navbarData || [], categoriesData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch navbar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncMissingCategories = async (navbarItems: NavbarItem[], categories: Category[]) => {
    const existingCategoryIds = navbarItems
      .filter(item => item.item_type === 'category')
      .map(item => item.category_id);

    const missingCategories = categories.filter(
      category => !existingCategoryIds.includes(category.id)
    );

    if (missingCategories.length > 0) {
      const maxOrder = Math.max(...navbarItems.map(item => item.display_order), 0);
      
      const newNavbarItems = missingCategories.map((category, index) => ({
        item_type: 'category',
        category_id: category.id,
        is_visible: true,
        display_order: maxOrder + index + 1
      }));

      const { error } = await supabase
        .from('navbar_items')
        .insert(newNavbarItems);

      if (error) {
        console.error('Error syncing categories:', error);
      } else {
        // Refresh the navbar items
        fetchNavbarItems();
      }
    }
  };

  const fetchNavbarItems = async () => {
    const { data, error } = await supabase
      .from('navbar_items')
      .select(`
        *,
        category:categories(name)
      `)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching navbar items:', error);
    } else {
      setNavbarItems(data || []);
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

  const refreshNavbarItems = async () => {
    setLoading(true);
    await fetchData();
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Menu className="h-8 w-8 text-red-600" />
              Navbar Management
            </h1>
            <p className="text-gray-600 mt-2">
              Control which navigation items are visible to customers in the header menu
            </p>
          </div>
          <Button
            onClick={refreshNavbarItems}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Menu className="h-5 w-5" />
              Navigation Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {navbarItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300 hover:border-red-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${item.is_visible ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {item.is_visible ? (
                        <Eye className="h-5 w-5 text-green-600" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-800">
                        {getItemLabel(item)}
                      </Label>
                      <p className="text-sm text-gray-500 capitalize">
                        {item.item_type} item • Order: {item.display_order}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      item.is_visible 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.is_visible ? 'Visible' : 'Hidden'}
                    </span>
                    <Switch
                      checked={item.is_visible}
                      onCheckedChange={(checked) => updateNavbarItem(item.id, checked)}
                      disabled={saving}
                      className="data-[state=checked]:bg-red-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {navbarItems.length === 0 && (
              <div className="text-center py-12">
                <Menu className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No navbar items found</h3>
                <p className="text-gray-500 mb-4">
                  Items will be created automatically when categories are added.
                </p>
                <Button onClick={refreshNavbarItems} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Items
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Available Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {categories.map((category) => {
                const hasNavbarItem = navbarItems.some(
                  item => item.item_type === 'category' && item.category_id === category.id
                );
                
                return (
                  <div
                    key={category.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      hasNavbarItem 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-white hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800">{category.name}</h4>
                        <p className="text-sm text-gray-500">
                          Status: {category.status}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        hasNavbarItem 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {hasNavbarItem ? 'In Menu' : 'Not Added'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {categories.length === 0 && (
              <div className="text-center py-8">
                <Plus className="h-8 w-8 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No active categories found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
