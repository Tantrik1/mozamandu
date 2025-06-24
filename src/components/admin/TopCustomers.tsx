
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TopCustomer {
  customer_name: string;
  customer_email: string;
  total_orders: number;
  total_spent: number;
}

export function TopCustomers() {
  const [customers, setCustomers] = useState<TopCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopCustomers();
  }, []);

  const fetchTopCustomers = async () => {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_name, customer_email, total_amount')
        .gte('created_at', oneMonthAgo.toISOString());

      if (error) throw error;

      const customerStats: { [key: string]: { orders: number; spent: number; email: string } } = {};
      
      orders?.forEach((order) => {
        if (!customerStats[order.customer_name]) {
          customerStats[order.customer_name] = { 
            orders: 0, 
            spent: 0, 
            email: order.customer_email 
          };
        }
        customerStats[order.customer_name].orders += 1;
        customerStats[order.customer_name].spent += Number(order.total_amount);
      });

      const topCustomers = Object.entries(customerStats)
        .map(([name, stats]) => ({
          customer_name: name,
          customer_email: stats.email,
          total_orders: stats.orders,
          total_spent: stats.spent,
        }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5);

      setCustomers(topCustomers);
    } catch (error) {
      console.error('Error fetching top customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Customers (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
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
        <CardTitle>Top 5 Customers (This Month)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {customers.map((customer, index) => (
            <div key={customer.customer_email} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div>
                  <p className="font-medium">{customer.customer_name}</p>
                  <p className="text-sm text-gray-600">{customer.customer_email}</p>
                  <p className="text-xs text-gray-500">
                    {customer.total_orders} orders
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">${customer.total_spent.toFixed(2)}</p>
              </div>
            </div>
          ))}
          {customers.length === 0 && (
            <p className="text-gray-500 text-center py-4">No customer data available this month</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
