
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Globe, Heart } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Mozamandu</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We are dedicated to providing high-quality products with exceptional customer service. 
            Our journey began with a simple mission: to make premium products accessible to everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-6 w-6 text-red-600 mr-2" />
                Our Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our passionate team works tirelessly to curate the best products and provide 
                outstanding customer service. We believe in building lasting relationships with our customers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-6 w-6 text-red-600 mr-2" />
                Quality Promise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We are committed to delivering only the highest quality products. Every item is 
                carefully selected and tested to meet our strict quality standards.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-6 w-6 text-red-600 mr-2" />
                Global Reach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                From our humble beginnings, we've grown to serve customers worldwide, 
                always maintaining our commitment to excellence and customer satisfaction.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-6 w-6 text-red-600 mr-2" />
                Customer First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our customers are at the heart of everything we do. We listen to feedback, 
                continuously improve our services, and go above and beyond to exceed expectations.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Join Our Community?</h2>
          <p className="text-gray-600 mb-6">
            Discover our amazing products and experience the difference quality makes.
          </p>
          <a 
            href="/products" 
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Shop Now
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
