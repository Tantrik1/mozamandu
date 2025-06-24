
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const defaultSockTypes = [
  {
    id: 1,
    name: 'Black Crew Socks',
    description: 'Classic comfort in black',
    image: '/lovable-uploads/51654152-d02f-443b-bb60-fd75dace40ee.png',
    color: 'from-gray-800 to-gray-900',
    subcategoryId: null
  },
  {
    id: 2,
    name: 'White Crew Socks',
    description: 'Clean and classic white',
    image: '/lovable-uploads/30eed4ab-ddd8-442c-aeae-041fd7ae3be3.png',
    color: 'from-gray-100 to-gray-300',
    subcategoryId: null
  },
  {
    id: 3,
    name: 'Light Crew Socks',
    description: 'Soft and comfortable',
    image: '/lovable-uploads/e02f8f14-3960-44fa-87db-499a23b30f02.png',
    color: 'from-gray-200 to-gray-400',
    subcategoryId: null
  },
  {
    id: 4,
    name: 'Navy Crew Socks',
    description: 'Professional navy style',
    image: '/lovable-uploads/9e1dcca9-44bc-44a8-aa02-56cef600abbb.png',
    color: 'from-blue-800 to-blue-900',
    subcategoryId: null
  },
  {
    id: 5,
    name: 'Olive Crew Socks',
    description: 'Military inspired comfort',
    image: '/lovable-uploads/1f8de054-b4a8-4e66-9281-8ae01c64eca1.png',
    color: 'from-green-700 to-green-800',
    subcategoryId: null
  },
  {
    id: 6,
    name: 'Yellow Crew Socks',
    description: 'Bright and cheerful',
    image: '/lovable-uploads/e4515907-f434-4c37-8328-ea5930a9c2e6.png',
    color: 'from-yellow-400 to-yellow-600',
    subcategoryId: null
  }
];

export function HeroSection() {
  const [currentSock, setCurrentSock] = useState(0);
  const [sockTypes, setSockTypes] = useState(defaultSockTypes);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSock(prev => (prev + 1) % sockTypes.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [sockTypes.length]);

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name')
        .eq('status', 'on')
        .in('name', ['Full Socks', 'Half Socks', 'Ankle Socks'])
        .limit(3);

      if (error) throw error;

      if (data && data.length > 0) {
        const updatedSockTypes = defaultSockTypes.map(sock => {
          let subcategory = data.find(sub => sub.name === sock.name);

          if (!subcategory && (sock.name.includes('Crew'))) {
            subcategory = data.find(sub => sub.name === 'Full Socks' || sub.name === 'Half Socks' || sub.name === 'Ankle Socks');
          }
          
          return {
            ...sock,
            subcategoryId: subcategory?.id || null
          };
        });
        setSockTypes(updatedSockTypes);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const handleSockClick = (sock: any) => {
    if (sock.subcategoryId) {
      window.location.href = `/subcategories/${sock.subcategoryId}`;
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,0,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full py-8 lg:py-0">
          {/* Left Side - Text Content */}
          <div className="space-y-6 lg:space-y-8 text-white order-2 lg:order-1">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                Premium
                <span className="block bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  Socks
                </span>
                Collection
              </h1>
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-300 leading-relaxed max-w-2xl">
                Discover comfort, style, and quality in every step. Our premium sock collection 
                offers the perfect blend of luxury and functionality.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-6 lg:px-8 py-3 text-base lg:text-lg font-medium w-full sm:w-auto">
                  Shop Now
                </Button>
              </Link>
              <Link to="/categories">
                <Button size="lg" variant="outline" className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-6 lg:px-8 py-3 text-base lg:text-lg font-medium w-full sm:w-auto">
                  View Collection
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 lg:gap-6 pt-6 lg:pt-8">
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-500">500+</div>
                <div className="text-gray-400 text-xs sm:text-sm lg:text-base">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-500">50+</div>
                <div className="text-gray-400 text-xs sm:text-sm lg:text-base">Designs</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-500">24/7</div>
                <div className="text-gray-400 text-xs sm:text-sm lg:text-base">Support</div>
              </div>
            </div>
          </div>

          {/* Right Side - Sock Images Showcase */}
          <div className="relative h-80 sm:h-96 lg:h-[500px] xl:h-[600px] flex items-center justify-center order-1 lg:order-2">
            {/* Sock Images Container */}
            <div className="relative w-full h-full overflow-hidden">
              {sockTypes.map((sock, index) => (
                <div
                  key={sock.id}
                  className={`absolute inset-0 transition-all duration-1000 transform cursor-pointer ${
                    index === currentSock 
                      ? 'opacity-100 scale-100 z-20' 
                      : 'opacity-0 scale-95 z-0'
                  }`}
                  onClick={() => handleSockClick(sock)}
                >
                  {/* Sock Image Container */}
                  <div className="w-full h-full flex items-center justify-center relative">
                    {/* Actual Sock Image */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 sm:p-6 lg:p-8 transition-transform duration-300 hover:scale-105">
                      <div className="mb-3 sm:mb-4 lg:mb-6 transform transition-transform duration-300">
                        <img 
                          src={sock.image} 
                          alt={sock.name}
                          className="w-40 h-40 sm:w-52 sm:h-52 lg:w-64 lg:h-64 xl:w-80 xl:h-80 object-contain drop-shadow-2xl filter brightness-110" 
                        />
                      </div>
                      
                      <div className="text-center">
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
                          {sock.name}
                        </h3>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-300">
                          {sock.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sock Indicators */}
            <div className="absolute bottom-4 lg:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {sockTypes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSock(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                    index === currentSock 
                      ? 'bg-red-500 scale-125' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 lg:bottom-8 left-4 lg:left-8 hidden sm:block">
        <div className="flex flex-col items-center text-white/60">
          <span className="text-xs lg:text-sm mb-2 rotate-90 origin-center">Scroll</span>
          <div className="w-px h-12 lg:h-16 bg-gradient-to-b from-white/60 to-transparent"></div>
        </div>
      </div>
    </section>
  );
}
