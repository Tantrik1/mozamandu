
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TopBarText {
  id: string;
  text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function TopBarTextManagement() {
  const [topBarText, setTopBarText] = useState<TopBarText | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    is_active: true,
  });

  useEffect(() => {
    fetchTopBarText();
  }, []);

  const fetchTopBarText = async () => {
    try {
      const { data, error } = await supabase
        .from('top_bar_text')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTopBarText(data);
        setFormData({
          text: data.text,
          is_active: data.is_active,
        });
      }
    } catch (error) {
      console.error('Error fetching top bar text:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch top bar text',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const textData = {
        text: formData.text,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (topBarText) {
        // Update existing record
        const { error } = await supabase
          .from('top_bar_text')
          .update(textData)
          .eq('id', topBarText.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Top bar text updated successfully',
        });
      } else {
        // Create new record
        const { error } = await supabase
          .from('top_bar_text')
          .insert([textData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Top bar text created successfully',
        });
      }

      fetchTopBarText();
    } catch (error) {
      console.error('Error saving top bar text:', error);
      toast({
        title: 'Error',
        description: 'Failed to save top bar text',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading top bar text...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Top Bar Text</h1>
        <p className="text-muted-foreground mt-1">Manage the announcement bar text</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Website Top Bar Text</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="text">Top Bar Text</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Enter text to display in the top bar"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                This text will be displayed at the top of your website
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Display top bar text</Label>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Top Bar Text'}
            </Button>
          </form>

          {topBarText && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Current Top Bar Text:</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1">{topBarText.text}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    topBarText.is_active
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {topBarText.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {new Date(topBarText.updated_at).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
