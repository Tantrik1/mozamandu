import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAnalyticsSettings } from '@/hooks/useAnalyticsSettings';
import { Loader2, Settings, BarChart3 } from 'lucide-react';
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

  const isConfigured = !!(settings.google_analytics_id || settings.facebook_pixel_id);

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
              To view analytics data, you need to configure your Google Analytics or Facebook Pixel IDs first.
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settings.google_analytics_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Google Analytics</CardTitle>
              <CardDescription>Tracking ID: {settings.google_analytics_id}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Google Analytics is configured and tracking visitors. View detailed analytics in your Google Analytics dashboard.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                  Open Google Analytics
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {settings.facebook_pixel_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Facebook Pixel</CardTitle>
              <CardDescription>Pixel ID: {settings.facebook_pixel_id}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Facebook Pixel is configured and tracking events. View detailed analytics in your Facebook Business dashboard.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer">
                  Open Events Manager
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
