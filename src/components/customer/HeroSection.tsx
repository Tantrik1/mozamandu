
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const defaultSockTypes = [
  {
    id: 1,
    name: 'Full Socks',
    description: 'Complete coverage and comfort',
    image: '/lovable-uploads/fd4fd25e-ccf5-42d0-a176-49b63583881b.png',
    color: 'from-red-500 to-red-700',
    categoryId: null
  },
  {
    id: 2,
    name: 'Half Socks',
    description: 'Perfect for casual wear',
    image: '/lovable-uploads/237dafb7-830d-417a-bbb5-1a22d7c3a115.png',
    color: 'from-red-600 to-red-800',
    categoryId: null
  },
  {
    id: 3,
    name: 'Ankle Socks',
    description: 'Minimal and stylish',
    image: '/lovable-uploads/c75106db-4b85-4396-a9eb-c802f441793b.png',
    color: 'from-red-700 to-red-900',
    categoryId: null
  }
];

export function HeroSection() {
  const [currentSock, setCurrentSock] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [sockTypes, setSockTypes] = useState(defaultSockTypes);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSock((prev) => (prev + 1) % sockTypes.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [sockTypes.length]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('status', 'on')
        .limit(3);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const updatedSockTypes = defaultSockTypes.map((sock, index) => ({
          ...sock,
          categoryId: data[index]?.id || null,
          name: data[index]?.name || sock.name
        }));
        setSockTypes(updatedSockTypes);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSockClick = (sock: any) => {
    if (sock.categoryId) {
      window.location.href = `/categories/${sock.categoryId}`;
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,0,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left Side - Text Content */}
          <div className="space-y-8 text-white">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Premium
                <span className="block bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  Socks
                </span>
                Collection
              </h1>
              <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed">
                Discover comfort, style, and quality in every step. Our premium sock collection 
                offers the perfect blend of luxury and functionality.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products">
                <Button 
                  size="lg" 
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg font-medium"
                >
                  Shop Now
                </Button>
              </Link>
              <Link to="/categories">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-8 py-3 text-lg font-medium"
                >
                  View Collection
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">500+</div>
                <div className="text-gray-400">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">50+</div>
                <div className="text-gray-400">Designs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">24/7</div>
                <div className="text-gray-400">Support</div>
              </div>
            </div>
          </div>

          {/* Right Side - Sock Images Showcase */}
          <div className="relative h-[600px] flex items-center justify-center">
            {/* Sock Images Container */}
            <div className="relative w-full h-full">
              {sockTypes.map((sock, index) => (
                <div
                  key={sock.id}
                  className={`absolute inset-0 transition-all duration-1000 transform cursor-pointer ${
                    index === currentSock
                      ? 'opacity-100 scale-100 rotate-0 z-20'
                      : index === (currentSock + 1) % sockTypes.length
                      ? 'opacity-30 scale-75 rotate-12 translate-x-20 z-10'
                      : 'opacity-0 scale-50 -rotate-12 -translate-x-20 z-0'
                  }`}
                  onClick={() => handleSockClick(sock)}
                >
                  {/* Sock Image Container */}
                  <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                    {/* Actual Sock Image */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 transition-transform duration-300 hover:scale-110">
                      <div className="mb-6 transform transition-transform duration-300">
                        <img 
                          src={sock.image} 
                          alt={sock.name}
                          className="max-w-full max-h-80 object-contain drop-shadow-2xl filter brightness-110"
                        />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-white">{sock.name}</h3>
                      <p className="text-lg opacity-90 text-white text-center">{sock.description}</p>
                      {sock.categoryId && (
                        <Button 
                          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSockClick(sock);
                          }}
                        >
                          Shop {sock.name}
                        </Button>
                      )}
                    </div>

                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent blur-xl animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Indicator Dots */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
              {sockTypes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSock(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
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
      <div className="absolute bottom-8 left-8">
        <div className="flex flex-col items-center text-white/60">
          <span className="text-sm mb-2 rotate-90 origin-center">Scroll</span>
          <div className="w-px h-16 bg-gradient-to-b from-white/60 to-transparent"></div>
        </div>
      </div>
    </section>
  );
}
