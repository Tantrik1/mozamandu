import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Eye, Users, Clock, TrendingUp, Globe } from 'lucide-react';

const visitorData = [
  { name: 'Mon', visitors: 1200, pageViews: 2400, bounceRate: 35 },
  { name: 'Tue', visitors: 1800, pageViews: 3200, bounceRate: 28 },
  { name: 'Wed', visitors: 1600, pageViews: 2800, bounceRate: 32 },
  { name: 'Thu', visitors: 2200, pageViews: 4100, bounceRate: 25 },
  { name: 'Fri', visitors: 2800, pageViews: 4800, bounceRate: 22 },
  { name: 'Sat', visitors: 3200, pageViews: 5200, bounceRate: 20 },
  { name: 'Sun', visitors: 2900, pageViews: 4900, bounceRate: 24 },
];

const deviceData = [
  { name: 'Desktop', value: 60, fill: 'hsl(var(--chart-1))' },
  { name: 'Mobile', value: 35, fill: 'hsl(var(--chart-2))' },
  { name: 'Tablet', value: 5, fill: 'hsl(var(--chart-3))' },
];

const topPages = [
  { page: '/products', views: 15420, percentage: 28 },
  { page: '/categories', views: 12340, percentage: 22 },
  { page: '/', views: 9870, percentage: 18 },
  { page: '/cart', views: 8760, percentage: 16 },
  { page: '/contact', views: 4320, percentage: 8 },
];

const trafficSources = [
  { source: 'Direct', visitors: 8900, percentage: 45 },
  { source: 'Google', visitors: 6200, percentage: 31 },
  { source: 'Social Media', visitors: 3100, percentage: 16 },
  { source: 'Referral', visitors: 1600, percentage: 8 },
];

export function VisitorsTab() {
  const [realtimeData, setRealtimeData] = useState({
    activeUsers: 324,
    sessionsToday: 1847,
    avgSessionDuration: '4:32',
    conversionRate: 3.4,
  });

  useEffect(() => {
    // Simulate realtime updates
    const interval = setInterval(() => {
      setRealtimeData(prev => ({
        ...prev,
        activeUsers: Math.floor(Math.random() * 100) + 250,
        sessionsToday: prev.sessionsToday + Math.floor(Math.random() * 5),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Realtime Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Eye className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Active Users</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-blue-700">{realtimeData.activeUsers}</p>
                  <Badge variant="secondary" className="bg-blue-200 text-blue-700">
                    Live
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Sessions Today</p>
                <p className="text-2xl font-bold text-green-700">{realtimeData.sessionsToday.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg Session</p>
                <p className="text-2xl font-bold text-purple-700">{realtimeData.avgSessionDuration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Conversion</p>
                <p className="text-2xl font-bold text-orange-700">{realtimeData.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitor Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Visitor Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                visitors: { label: "Visitors", color: "hsl(var(--chart-1))" },
                pageViews: { label: "Page Views", color: "hsl(var(--chart-2))" },
              }}
              className="h-[200px]"
            >
              <AreaChart data={visitorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
                mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
                tablet: { label: "Tablet", color: "hsl(var(--chart-3))" },
              }}
              className="h-[200px]"
            >
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{page.page}</p>
                    <p className="text-sm text-muted-foreground">{page.views.toLocaleString()} views</p>
                  </div>
                  <Badge variant="outline">{page.percentage}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trafficSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{source.source}</p>
                    <p className="text-sm text-muted-foreground">{source.visitors.toLocaleString()} visitors</p>
                  </div>
                  <Badge variant="outline">{source.percentage}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bounce Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Bounce Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              bounceRate: { label: "Bounce Rate", color: "hsl(var(--chart-3))" },
            }}
            className="h-[200px]"
          >
            <BarChart data={visitorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="bounceRate" fill="hsl(var(--chart-3))" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}