import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAnalyticsSettings } from '@/hooks/useAnalyticsSettings';
import { useSearchConsoleData } from '@/hooks/useSearchConsoleData';
import { 
  Loader2, Settings, BarChart3, Search, CheckCircle, XCircle, 
  ExternalLink, RefreshCw, MousePointer, Eye, TrendingUp, Globe,
  Monitor, Smartphone, Tablet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export function AnalyticsDashboard() {
  const { settings, loading: settingsLoading } = useAnalyticsSettings();
  const [days, setDays] = useState('28');
  const { data, loading: dataLoading, error, refetch } = useSearchConsoleData(days);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isTrackingConfigured = !!settings.google_analytics_id;
  const isSearchConsoleConfigured = !!(
    settings.google_service_account_email &&
    settings.google_private_key &&
    settings.google_search_console_site_url
  );
  const isConfigured = isTrackingConfigured || isSearchConsoleConfigured;

  if (!isConfigured) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <CardTitle className="text-lg md:text-xl">Analytics Not Configured</CardTitle>
            <CardDescription className="text-sm">
              To view analytics data, you need to configure your Google Analytics or Search Console integration first.
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

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            View your site analytics and SEO performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/analytics-settings">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Google Analytics</CardTitle>
            {isTrackingConfigured ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {isTrackingConfigured ? (
              <>
                <div className="text-sm md:text-lg font-semibold text-green-600">Connected</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {settings.google_analytics_id}
                </p>
              </>
            ) : (
              <div className="text-sm md:text-lg font-semibold text-muted-foreground">Not Configured</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Search Console</CardTitle>
            {isSearchConsoleConfigured ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {isSearchConsoleConfigured ? (
              <>
                <div className="text-sm md:text-lg font-semibold text-green-600">Connected</div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {settings.google_search_console_site_url}
                </p>
              </>
            ) : (
              <div className="text-sm md:text-lg font-semibold text-muted-foreground">Not Configured</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search Console Data */}
      {isSearchConsoleConfigured && (
        <>
          {/* Date Range Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Console Data
            </h2>
            <div className="flex items-center gap-2">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="28">Last 28 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={refetch} disabled={dataLoading}>
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card className="border-destructive/50">
              <CardContent className="p-4 md:p-6">
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" onClick={refetch} className="mt-4">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : data ? (
            <>
              {/* Summary Stats */}
              <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Total Clicks</CardTitle>
                    <MousePointer className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="text-xl md:text-2xl font-bold">{data.summary.clicks.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Impressions</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="text-xl md:text-2xl font-bold">{data.summary.impressions.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">CTR</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="text-xl md:text-2xl font-bold">{(data.summary.ctr * 100).toFixed(2)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">Avg Position</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="text-xl md:text-2xl font-bold">{data.summary.position.toFixed(1)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Chart */}
              {data.timeSeries.length > 0 && (
                <Card>
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg">Performance Over Time</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Clicks and impressions trend</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 md:p-6 pt-0">
                    <div className="h-[200px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.timeSeries}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            contentStyle={{ fontSize: 12 }}
                          />
                          <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="impressions" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-primary" />
                        <span>Clicks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-muted-foreground" />
                        <span>Impressions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Tables Grid */}
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                {/* Top Queries */}
                {data.queries.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg">Top Queries</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Search terms driving traffic</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 md:p-6 md:pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Query</TableHead>
                              <TableHead className="text-xs text-right">Clicks</TableHead>
                              <TableHead className="text-xs text-right hidden sm:table-cell">Impressions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.queries.slice(0, 10).map((query, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs font-medium max-w-[150px] md:max-w-none truncate">{query.keys[0]}</TableCell>
                                <TableCell className="text-xs text-right">{query.clicks}</TableCell>
                                <TableCell className="text-xs text-right hidden sm:table-cell">{query.impressions}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Pages */}
                {data.pages.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg">Top Pages</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Best performing pages</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 md:p-6 md:pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Page</TableHead>
                              <TableHead className="text-xs text-right">Clicks</TableHead>
                              <TableHead className="text-xs text-right hidden sm:table-cell">CTR</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.pages.slice(0, 10).map((page, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs font-medium max-w-[150px] md:max-w-none truncate">
                                  {new URL(page.keys[0]).pathname || '/'}
                                </TableCell>
                                <TableCell className="text-xs text-right">{page.clicks}</TableCell>
                                <TableCell className="text-xs text-right hidden sm:table-cell">{(page.ctr * 100).toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Countries */}
                {data.countries.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Top Countries
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">Traffic by country</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 md:p-6 md:pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Country</TableHead>
                              <TableHead className="text-xs text-right">Clicks</TableHead>
                              <TableHead className="text-xs text-right hidden sm:table-cell">Impressions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.countries.slice(0, 10).map((country, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs font-medium">{country.keys[0]}</TableCell>
                                <TableCell className="text-xs text-right">{country.clicks}</TableCell>
                                <TableCell className="text-xs text-right hidden sm:table-cell">{country.impressions}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Devices */}
                {data.devices.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg">Devices</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Traffic by device type</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      <div className="space-y-3">
                        {data.devices.map((device, index) => {
                          const total = data.devices.reduce((sum, d) => sum + d.clicks, 0);
                          const percentage = total > 0 ? (device.clicks / total) * 100 : 0;
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex items-center justify-between text-xs md:text-sm">
                                <div className="flex items-center gap-2">
                                  {getDeviceIcon(device.keys[0])}
                                  <span className="capitalize">{device.keys[0]}</span>
                                </div>
                                <span className="font-medium">{device.clicks} clicks</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : null}
        </>
      )}

      {/* Google Analytics Link */}
      {isTrackingConfigured && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Google Analytics
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">View detailed analytics in Google Analytics dashboard</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <Button variant="outline" asChild>
              <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Google Analytics
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}