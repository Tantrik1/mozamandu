
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;           // Lovable Cloud column
  whatsapp: string | null;        // Lovable Cloud column
  contact_number: string | null;  // External Supabase column
  whatsapp_number: string | null; // External Supabase column
  role: string;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

interface CustomerStatsProps {
  customers: Customer[];
}

export function CustomerStats({ customers }: CustomerStatsProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{customers.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {customers.filter(c => c.total_orders > 0).length}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            Rs. {customers.reduce((sum, c) => sum + c.total_spent, 0).toFixed(2)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
