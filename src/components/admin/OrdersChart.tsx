
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyOrder {
  month: string;
  orders: number;
  revenue: number;
}

export function OrdersChart() {
  const [data, setData] = useState<MonthlyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrdersByMonth();
  }, []);

  const fetchOrdersByMonth = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const monthlyData: { [key: string]: { orders: number; revenue: number } } = {};
      
      orders?.forEach((order) => {
        const date = new Date(order.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { orders: 0, revenue: 0 };
        }
        
        monthlyData[monthKey].orders += 1;
        monthlyData[monthKey].revenue += Number(order.total_amount);
      });

      const chartData = Object.entries(monthlyData)
        .map(([key, value]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return {
            month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
            orders: value.orders,
            revenue: value.revenue,
          };
        })
        .reverse()
        .slice(-6); // Last 6 months

      setData(chartData);
    } catch (error) {
      console.error('Error fetching orders by month:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders by Month</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="orders" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
