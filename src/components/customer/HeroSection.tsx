
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const sockTypes = [
  {
    id: 1,
    name: 'Full Socks',
    description: 'Complete coverage and comfort',
    image: '/placeholder.svg',
    color: 'from-red-500 to-red-700'
  },
  {
    id: 2,
    name: 'Ankle Socks',
    description: 'Perfect for casual wear',
    image: '/placeholder.svg',
    color: 'from-red-600 to-red-800'
  },
  {
    id: 3,
    name: 'Half Socks',
    description: 'Minimal and stylish',
    image: '/placeholder.svg',
    color: 'from-red-700 to-red-900'
  }
];

export function HeroSection() {
  const [currentSock, setCurrentSock] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSock((prev) => (prev + 1) % sockTypes.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const nextSock = () => {
    setCurrentSock((prev) => (prev + 1) % sockTypes.length);
  };

  const prevSock = () => {
    setCurrentSock((prev) => (prev - 1 + sockTypes.length) % sockTypes.length);
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
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg font-medium"
              >
                Shop Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-8 py-3 text-lg font-medium"
              >
                View Collection
              </Button>
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

          {/* Right Side - 3D Model Showcase */}
          <div className="relative h-[600px] flex items-center justify-center">
            {/* 3D Model Container */}
            <div className="relative w-full h-full">
              {sockTypes.map((sock, index) => (
                <div
                  key={sock.id}
                  className={`absolute inset-0 transition-all duration-1000 transform ${
                    index === currentSock
                      ? 'opacity-100 scale-100 rotate-0'
                      : index === (currentSock + 1) % sockTypes.length
                      ? 'opacity-30 scale-75 rotate-12 translate-x-20'
                      : 'opacity-0 scale-50 -rotate-12 -translate-x-20'
                  }`}
                >
                  {/* 3D Model Placeholder */}
                  <div className={`w-full h-full bg-gradient-to-br ${sock.color} rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden`}>
                    {/* Floating Animation */}
                    <div className="absolute inset-0 animate-pulse">
                      <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                    
                    {/* Sock Representation */}
                    <div className="relative z-10 text-center text-white">
                      <div className="text-8xl mb-4">🧦</div>
                      <h3 className="text-2xl font-bold mb-2">{sock.name}</h3>
                      <p className="text-lg opacity-90">{sock.description}</p>
                    </div>

                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent blur-xl"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <Button
                onClick={prevSock}
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex space-x-2 items-center">
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

              <Button
                onClick={nextSock}
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
