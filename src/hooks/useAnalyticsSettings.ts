import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsSettings {
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  is_active: boolean;
}

export function useAnalyticsSettings() {
  const [settings, setSettings] = useState<AnalyticsSettings>({ is_active: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analytics_settings')
        .select('google_analytics_id, facebook_pixel_id, is_active')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          google_analytics_id: data.google_analytics_id || undefined,
          facebook_pixel_id: data.facebook_pixel_id || undefined,
          is_active: data.is_active ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<AnalyticsSettings>) => {
    try {
      setSaving(true);

      // Check if a record exists
      const { data: existing } = await supabase
        .from('analytics_settings')
        .select('id')
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('analytics_settings')
          .update({
            google_analytics_id: newSettings.google_analytics_id || null,
            facebook_pixel_id: newSettings.facebook_pixel_id || null,
            is_active: newSettings.is_active ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('analytics_settings')
          .insert({
            google_analytics_id: newSettings.google_analytics_id || null,
            facebook_pixel_id: newSettings.facebook_pixel_id || null,
            is_active: newSettings.is_active ?? true,
          });

        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Analytics settings have been saved successfully.',
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error saving analytics settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save analytics settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteSettings = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('analytics_settings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      toast({
        title: 'Settings Deleted',
        description: 'Analytics settings have been removed.',
      });

      setSettings({ is_active: false });
    } catch (error) {
      console.error('Error deleting analytics settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete analytics settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    deleteSettings,
    refetch: fetchSettings,
  };
}
