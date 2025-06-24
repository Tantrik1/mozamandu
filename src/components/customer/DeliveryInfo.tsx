
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Truck } from 'lucide-react';

export function DeliveryInfo() {
  const schedules = [
    {
      time: "Order before 12 PM",
      delivery: "Get your order delivered on the same day between 12-3 PM"
    },
    {
      time: "Order between 12-2 PM",
      delivery: "Get your order delivered same day between 3-6 PM or next day 12-3 PM"
    },
    {
      time: "Order after 2 PM",
      delivery: "Get your order delivered the next day between 12-3 PM"
    }
  ];

  const locations = [
    { name: "Kathmandu", price: "FREE" },
    { name: "Bhaktapur", price: "FREE" },
    { name: "Lalitpur", price: "FREE" },
    { name: "Pokhara", price: "Rs. 150" },
    { name: "Chitwan", price: "Rs. 200" },
    { name: "+70 more", price: "Rs. 150-350" }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Fast Delivery Schedule</h2>
          <p className="text-gray-600 text-lg">We pride ourselves on our efficient delivery service within Kathmandu Valley</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Delivery Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-red-600" />
                Delivery Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {schedules.map((schedule, index) => (
                <div key={index} className="border-l-4 border-red-600 pl-4">
                  <h4 className="font-semibold text-red-600">{schedule.time}</h4>
                  <p className="text-gray-600 text-sm">{schedule.delivery}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Delivery Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-red-600" />
                Delivery Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                We deliver to all 75 districts of Nepal with different delivery charges.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {locations.map((location, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{location.name}</span>
                    <Badge variant={location.price === "FREE" ? "default" : "outline"}>
                      {location.price}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
