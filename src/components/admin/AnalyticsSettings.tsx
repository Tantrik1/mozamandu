import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyticsSettings } from '@/hooks/useAnalyticsSettings';
import { Loader2, Save, Trash2, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AnalyticsSettings() {
  const { settings, loading, saving, saveSettings, deleteSettings } = useAnalyticsSettings();
  const [formData, setFormData] = useState({
    google_analytics_id: '',
    facebook_pixel_id: '',
  });
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (settings && !initialLoadDone.current) {
      setFormData({
        google_analytics_id: settings.google_analytics_id || '',
        facebook_pixel_id: settings.facebook_pixel_id || '',
      });
      initialLoadDone.current = true;
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      google_analytics_id: formData.google_analytics_id,
      facebook_pixel_id: formData.facebook_pixel_id,
      is_active: true,
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete all analytics settings?')) {
      await deleteSettings();
      setFormData({
        google_analytics_id: '',
        facebook_pixel_id: '',
      });
      initialLoadDone.current = false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConfigured = !!(settings.google_analytics_id || settings.facebook_pixel_id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Settings</h1>
        <p className="text-muted-foreground">
          Configure Google Analytics and Facebook Pixel tracking
        </p>
      </div>

      {isConfigured ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Analytics Configured</AlertTitle>
          <AlertDescription className="text-green-700">
            Your analytics tracking is configured and active.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Analytics Not Configured</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Please configure your analytics IDs below to enable tracking.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tracking Configuration
          </CardTitle>
          <CardDescription>
            Enter your tracking IDs to enable analytics on your site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="google_analytics_id">
                Google Analytics ID
              </Label>
              <Input
                id="google_analytics_id"
                placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                value={formData.google_analytics_id}
                onChange={(e) => setFormData({ ...formData, google_analytics_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your Google Analytics 4 measurement ID (starts with G-) or Universal Analytics ID (starts with UA-)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook_pixel_id">
                Facebook Pixel ID
              </Label>
              <Input
                id="facebook_pixel_id"
                placeholder="XXXXXXXXXXXXXXXX"
                value={formData.facebook_pixel_id}
                onChange={(e) => setFormData({ ...formData, facebook_pixel_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your Facebook Pixel ID for tracking conversions and events
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>

              {isConfigured && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Settings
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
