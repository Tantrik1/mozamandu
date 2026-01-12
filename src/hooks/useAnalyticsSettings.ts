import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsSettings {
  // Tracking IDs
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  // Search Console credentials
  google_service_account_email?: string;
  google_private_key?: string;
  google_search_console_site_url?: string;
  is_active: boolean;
}

interface SettingRow {
  id: string;
  setting_key: string;
  setting_value: string;
  is_encrypted: boolean;
}

export function useAnalyticsSettings() {
  const [settings, setSettings] = useState<AnalyticsSettings>({ is_active: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch all settings as key-value pairs (matching external DB schema)
      const { data, error } = await supabase
        .from('analytics_settings')
        .select('*');

      if (error) throw error;

      // Convert key-value pairs to settings object
      // The external DB uses: id, setting_key, setting_value, is_encrypted
      const settingsMap: Record<string, string> = {};
      const rows = data as unknown as SettingRow[];
      (rows || []).forEach((row) => {
        if (row.setting_key && row.setting_value) {
          settingsMap[row.setting_key] = row.setting_value;
        }
      });

      setSettings({
        google_analytics_id: settingsMap['google_analytics_id'] || undefined,
        facebook_pixel_id: settingsMap['facebook_pixel_id'] || undefined,
        google_service_account_email: settingsMap['google_service_account_email'] || undefined,
        google_private_key: settingsMap['google_private_key'] || undefined,
        google_search_console_site_url: settingsMap['google_search_console_site_url'] || undefined,
        is_active: settingsMap['is_active'] === 'true' || Object.keys(settingsMap).length > 0,
      });
    } catch (error) {
      console.error('Error fetching analytics settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const upsertSetting = async (key: string, value: string, isEncrypted: boolean = false) => {
    // Check if setting exists using filter to avoid TypeScript issues
    const { data: existing } = await supabase
      .from('analytics_settings')
      .select('id')
      .filter('setting_key', 'eq', key)
      .maybeSingle();

    if (existing) {
      // Update existing
      const updateData = {
        setting_value: value,
        is_encrypted: isEncrypted,
      };
      const { error } = await supabase
        .from('analytics_settings')
        .update(updateData as any)
        .filter('setting_key', 'eq', key);
      
      if (error) throw error;
    } else if (value) {
      // Insert new (only if value is not empty)
      const insertData = {
        setting_key: key,
        setting_value: value,
        is_encrypted: isEncrypted,
      };
      const { error } = await supabase
        .from('analytics_settings')
        .insert(insertData as any);
      
      if (error) throw error;
    }
  };

  const saveSettings = async (newSettings: Partial<AnalyticsSettings>) => {
    try {
      setSaving(true);

      // Save each setting as a key-value pair
      if (newSettings.google_analytics_id !== undefined) {
        await upsertSetting('google_analytics_id', newSettings.google_analytics_id || '');
      }
      if (newSettings.facebook_pixel_id !== undefined) {
        await upsertSetting('facebook_pixel_id', newSettings.facebook_pixel_id || '');
      }
      if (newSettings.google_service_account_email !== undefined) {
        await upsertSetting('google_service_account_email', newSettings.google_service_account_email || '');
      }
      if (newSettings.google_private_key !== undefined) {
        await upsertSetting('google_private_key', newSettings.google_private_key || '', true);
      }
      if (newSettings.google_search_console_site_url !== undefined) {
        await upsertSetting('google_search_console_site_url', newSettings.google_search_console_site_url || '');
      }
      if (newSettings.is_active !== undefined) {
        await upsertSetting('is_active', newSettings.is_active ? 'true' : 'false');
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
      
      // Delete specific analytics-related keys
      const keysToDelete = [
        'google_analytics_id', 
        'facebook_pixel_id', 
        'google_service_account_email',
        'google_private_key',
        'google_search_console_site_url',
        'is_active'
      ];
      
      for (const key of keysToDelete) {
        // Use raw query to avoid TypeScript issues with external schema
        await supabase
          .from('analytics_settings')
          .delete()
          .filter('setting_key', 'eq', key);
      }

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
