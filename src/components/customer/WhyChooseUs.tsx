
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, CheckCircle, Truck, DollarSign, Package } from 'lucide-react';

export function WhyChooseUs() {
  const features = [
    {
      icon: CheckCircle,
      title: "Premium Quality",
      description: "Our socks are made with high-quality materials for ultimate comfort and durability."
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Same day delivery available for orders placed before 2 PM in Kathmandu Valley."
    },
    {
      icon: DollarSign,
      title: "Best Prices",
      description: "Competitive pricing with special discounts on bulk orders and combos."
    },
    {
      icon: Package,
      title: "Custom Combos",
      description: "Create your own personalized collection with our mix and match options."
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose Mozamandu?</h2>
          <p className="text-gray-600 text-lg">We pride ourselves on quality, comfort, and customer satisfaction</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <IconComponent className="h-8 w-8 text-red-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
