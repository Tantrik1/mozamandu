import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsSettings {
  google_service_account_email?: string;
  google_private_key?: string;
  google_search_console_site_url?: string;
  is_configured: boolean;
  has_private_key?: boolean;
}

export function useAnalyticsSettings() {
  const [settings, setSettings] = useState<AnalyticsSettings>({ is_configured: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analytics_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((item: { setting_key: string; setting_value: string }) => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      const isConfigured = !!(
        settingsMap.google_service_account_email &&
        settingsMap.google_private_key &&
        settingsMap.google_search_console_site_url
      );

      setSettings({
        google_service_account_email: settingsMap.google_service_account_email,
        google_private_key: undefined, // Never expose the private key
        google_search_console_site_url: settingsMap.google_search_console_site_url,
        is_configured: isConfigured,
        has_private_key: !!settingsMap.google_private_key,
      });
    } catch (error) {
      console.error('Error fetching analytics settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Omit<AnalyticsSettings, 'is_configured' | 'has_private_key'>) => {
    try {
      setSaving(true);

      const settingsToSave: { setting_key: string; setting_value: string; is_encrypted?: boolean }[] = [
        { setting_key: 'google_service_account_email', setting_value: newSettings.google_service_account_email || '' },
        { setting_key: 'google_search_console_site_url', setting_value: newSettings.google_search_console_site_url || '' },
      ];

      // Only update private key if provided
      if (newSettings.google_private_key) {
        settingsToSave.push({ 
          setting_key: 'google_private_key', 
          setting_value: newSettings.google_private_key, 
          is_encrypted: true 
        });
      }

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('analytics_settings')
          .upsert(setting, { onConflict: 'setting_key' });

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
        .in('setting_key', [
          'google_service_account_email',
          'google_private_key',
          'google_search_console_site_url',
        ]);

      if (error) throw error;

      toast({
        title: 'Settings Deleted',
        description: 'Analytics settings have been removed.',
      });

      setSettings({ is_configured: false });
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
