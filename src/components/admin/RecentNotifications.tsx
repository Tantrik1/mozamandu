
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Calendar } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export function RecentNotifications() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentNotices();
  }, []);

  const fetchRecentNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, description, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching recent notices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Recent Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notices.map((notice) => (
            <div key={notice.id} className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-sm">{notice.title}</h4>
                    <Badge variant={notice.is_active ? "default" : "secondary"} className="text-xs">
                      {notice.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {notice.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notice.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(notice.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {notices.length === 0 && (
            <p className="text-gray-500 text-center py-4">No notifications yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
