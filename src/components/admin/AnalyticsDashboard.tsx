import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAnalyticsSettings } from '@/hooks/useAnalyticsSettings';
import { Loader2, Settings, BarChart3, Search, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AnalyticsDashboard() {
  const { settings, loading: settingsLoading } = useAnalyticsSettings();

  if (settingsLoading) {
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

  if (!isConfigured) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Analytics Not Configured</CardTitle>
            <CardDescription>
              To view analytics data, you need to configure your tracking pixels or Search Console integration first.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/admin/analytics-settings">
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Configure Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            View your site analytics and tracking status
          </p>
        </div>
        <Link to="/admin/analytics-settings">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Analytics</CardTitle>
            {settings.google_analytics_id ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {settings.google_analytics_id ? (
              <>
                <div className="text-lg font-semibold text-green-600">Connected</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {settings.google_analytics_id}
                </p>
              </>
            ) : (
              <div className="text-lg font-semibold text-muted-foreground">Not Configured</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facebook Pixel</CardTitle>
            {settings.facebook_pixel_id ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {settings.facebook_pixel_id ? (
              <>
                <div className="text-lg font-semibold text-green-600">Connected</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {settings.facebook_pixel_id}
                </p>
              </>
            ) : (
              <div className="text-lg font-semibold text-muted-foreground">Not Configured</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Console</CardTitle>
            {isSearchConsoleConfigured ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {isSearchConsoleConfigured ? (
              <>
                <div className="text-lg font-semibold text-green-600">Connected</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {settings.google_search_console_site_url}
                </p>
              </>
            ) : (
              <div className="text-lg font-semibold text-muted-foreground">Not Configured</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {settings.google_analytics_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Google Analytics
              </CardTitle>
              <CardDescription>Tracking ID: {settings.google_analytics_id}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Google Analytics is configured and tracking visitors. View detailed analytics in your Google Analytics dashboard.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Google Analytics
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {settings.facebook_pixel_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Facebook Pixel
              </CardTitle>
              <CardDescription>Pixel ID: {settings.facebook_pixel_id}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Facebook Pixel is configured and tracking events. View detailed analytics in your Facebook Business dashboard.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Events Manager
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {isSearchConsoleConfigured && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Google Search Console
              </CardTitle>
              <CardDescription>Site: {settings.google_search_console_site_url}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Search Console API is connected. You can access SEO performance data through the backend.
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Service Account:</strong> {settings.google_service_account_email}
                </p>
                <Button variant="outline" asChild>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Search Console
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}