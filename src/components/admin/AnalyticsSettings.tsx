import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyticsSettings } from '@/hooks/useAnalyticsSettings';
import { Loader2, Save, Trash2, Settings, CheckCircle, AlertCircle, Search, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export function AnalyticsSettings() {
  const { settings, loading, saving, saveSettings, deleteSettings } = useAnalyticsSettings();
  const [formData, setFormData] = useState({
    google_analytics_id: '',
    facebook_pixel_id: '',
    google_service_account_email: '',
    google_private_key: '',
    google_search_console_site_url: '',
  });
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (settings && !initialLoadDone.current) {
      setFormData({
        google_analytics_id: settings.google_analytics_id || '',
        facebook_pixel_id: settings.facebook_pixel_id || '',
        google_service_account_email: settings.google_service_account_email || '',
        google_private_key: settings.google_private_key || '',
        google_search_console_site_url: settings.google_search_console_site_url || '',
      });
      initialLoadDone.current = true;
    }
  }, [settings]);

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      google_analytics_id: formData.google_analytics_id,
      facebook_pixel_id: formData.facebook_pixel_id,
      is_active: true,
    });
  };

  const handleSubmitSearchConsole = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      google_service_account_email: formData.google_service_account_email,
      google_private_key: formData.google_private_key,
      google_search_console_site_url: formData.google_search_console_site_url,
      is_active: true,
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete all analytics settings?')) {
      await deleteSettings();
      setFormData({
        google_analytics_id: '',
        facebook_pixel_id: '',
        google_service_account_email: '',
        google_private_key: '',
        google_search_console_site_url: '',
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

  const isTrackingConfigured = !!(settings.google_analytics_id || settings.facebook_pixel_id);
  const isSearchConsoleConfigured = !!(
    settings.google_service_account_email &&
    settings.google_private_key &&
    settings.google_search_console_site_url
  );
  const isConfigured = isTrackingConfigured || isSearchConsoleConfigured;

  // Mask the private key for display
  const maskedPrivateKey = settings.google_private_key
    ? '••••••••••••••••••••' + settings.google_private_key.slice(-20)
    : '';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Settings</h1>
        <p className="text-muted-foreground">
          Configure tracking pixels and Search Console integration
        </p>
      </div>

      {isConfigured ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Analytics Configured</AlertTitle>
          <AlertDescription className="text-green-700">
            {isTrackingConfigured && isSearchConsoleConfigured
              ? 'Tracking pixels and Search Console are configured.'
              : isTrackingConfigured
              ? 'Tracking pixels are configured. Search Console is not configured.'
              : 'Search Console is configured. Tracking pixels are not configured.'}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Analytics Not Configured</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Please configure your analytics settings below to enable tracking and reporting.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tracking Pixels
          </TabsTrigger>
          <TabsTrigger value="search-console" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Console
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="mt-4">
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
              <form onSubmit={handleSubmitTracking} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
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
                  <Label htmlFor="facebook_pixel_id">Facebook Pixel ID</Label>
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

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Tracking Settings
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search-console" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Google Search Console Configuration
              </CardTitle>
              <CardDescription>
                Configure your Google Search Console API credentials for SEO data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSearchConsoleConfigured && (
                <Alert className="mb-6 border-blue-200 bg-blue-50">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Search Console Connected</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    <div className="mt-2 space-y-1 text-sm">
                      <p><strong>Email:</strong> {settings.google_service_account_email}</p>
                      <p><strong>Site URL:</strong> {settings.google_search_console_site_url}</p>
                      <p><strong>Private Key:</strong> {maskedPrivateKey}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmitSearchConsole} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="google_service_account_email">Service Account Email</Label>
                  <Input
                    id="google_service_account_email"
                    type="email"
                    placeholder="your-service-account@project.iam.gserviceaccount.com"
                    value={formData.google_service_account_email}
                    onChange={(e) => setFormData({ ...formData, google_service_account_email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The email address of your Google Cloud service account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google_private_key">Private Key</Label>
                  <Textarea
                    id="google_private_key"
                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                    value={formData.google_private_key}
                    onChange={(e) => setFormData({ ...formData, google_private_key: e.target.value })}
                    rows={4}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    The private key from your Google Cloud service account JSON file
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google_search_console_site_url">Search Console Site URL</Label>
                  <Input
                    id="google_search_console_site_url"
                    placeholder="https://your-website.com"
                    value={formData.google_search_console_site_url}
                    onChange={(e) => setFormData({ ...formData, google_search_console_site_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your verified site URL in Google Search Console
                  </p>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Search Console Settings
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isConfigured && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Delete all analytics settings. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}