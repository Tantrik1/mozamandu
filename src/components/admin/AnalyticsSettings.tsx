import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAnalyticsSettings } from '@/hooks/useAnalyticsSettings';
import { Loader2, Save, Trash2, Key, Globe, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AnalyticsSettings() {
  const { settings, loading, saving, saveSettings, deleteSettings } = useAnalyticsSettings();
  const [formData, setFormData] = useState({
    google_service_account_email: '',
    google_private_key: '',
    google_search_console_site_url: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        google_service_account_email: settings.google_service_account_email || '',
        google_private_key: settings.google_private_key || '',
        google_search_console_site_url: settings.google_search_console_site_url || '',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(formData);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete all analytics settings?')) {
      await deleteSettings();
      setFormData({
        google_service_account_email: '',
        google_private_key: '',
        google_search_console_site_url: '',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Settings</h1>
        <p className="text-muted-foreground">
          Configure Google Search Console API credentials to enable analytics
        </p>
      </div>

      {settings.is_configured ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Analytics Configured</AlertTitle>
          <AlertDescription className="text-green-700">
            Your Google Search Console credentials are configured. You can view analytics data in the Analytics page.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Analytics Not Configured</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Please configure your Google Search Console credentials below to enable analytics.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Google Search Console Credentials
          </CardTitle>
          <CardDescription>
            Enter your Google Cloud service account credentials to fetch Search Console data.
            You need to create a service account in Google Cloud Console and grant it access to your Search Console property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="service_account_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Service Account Email
              </Label>
              <Input
                id="service_account_email"
                type="email"
                placeholder="your-service-account@project-id.iam.gserviceaccount.com"
                value={formData.google_service_account_email}
                onChange={(e) => setFormData({ ...formData, google_service_account_email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The email address of your Google Cloud service account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="private_key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Private Key
              </Label>
              <Textarea
                id="private_key"
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                value={formData.google_private_key}
                onChange={(e) => setFormData({ ...formData, google_private_key: e.target.value })}
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                The private key from your service account JSON file (including BEGIN and END markers)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_url" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Search Console Site URL
              </Label>
              <Input
                id="site_url"
                type="url"
                placeholder="https://mozamandu.com or sc-domain:mozamandu.com"
                value={formData.google_search_console_site_url}
                onChange={(e) => setFormData({ ...formData, google_search_console_site_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your verified property URL in Google Search Console (URL prefix or domain property)
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

              {settings.is_configured && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Settings
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">1. Create a Google Cloud Project</h4>
            <p className="text-sm text-muted-foreground">
              Go to the Google Cloud Console and create a new project or select an existing one.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">2. Enable the Search Console API</h4>
            <p className="text-sm text-muted-foreground">
              In your project, go to APIs & Services → Library and enable the "Google Search Console API".
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">3. Create a Service Account</h4>
            <p className="text-sm text-muted-foreground">
              Go to APIs & Services → Credentials → Create Credentials → Service Account. 
              Download the JSON key file.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">4. Grant Access in Search Console</h4>
            <p className="text-sm text-muted-foreground">
              In Google Search Console, go to Settings → Users and permissions → Add user. 
              Add the service account email with "Full" permission.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
