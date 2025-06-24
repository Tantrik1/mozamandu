
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const sockImages = [
  '/lovable-uploads/51654152-d02f-443b-bb60-fd75dace40ee.png',
  '/lovable-uploads/30eed4ab-ddd8-442c-aeae-041fd7ae3be3.png',
  '/lovable-uploads/e02f8f14-3960-44fa-87db-499a23b30f02.png',
  '/lovable-uploads/9e1dcca9-44bc-44a8-aa02-56cef600abbb.png',
  '/lovable-uploads/1f8de054-b4a8-4e66-9281-8ae01c64eca1.png',
  '/lovable-uploads/e4515907-f434-4c37-8328-ea5930a9c2e6.png',
];

export function HeroSection() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage(prev => (prev + 1) % sockImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,0,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left Side Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight">
              Premium
              <span className="block text-red-500">Sock Collection</span>
            </h1>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
              Discover our exclusive range of comfortable, stylish socks crafted with premium materials for everyday luxury.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/categories">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105">
                  Shop Now
                </Button>
              </Link>
              
              <Link to="/about">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side - Sock Images */}
          <div className="relative w-full max-w-lg mx-auto h-80 sm:h-96 lg:h-[500px] xl:h-[600px] flex items-center justify-center order-1 lg:order-2">
            <div className="relative w-full h-full overflow-hidden">
              {sockImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-1000 transform ${
                    index === currentImage 
                      ? 'opacity-100 scale-100 z-20' 
                      : 'opacity-0 scale-95 z-0'
                  }`}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={image} 
                      alt={`Premium Sock ${index + 1}`}
                      className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 xl:w-96 xl:h-96 object-contain drop-shadow-2xl filter brightness-110 transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Image Indicators */}
            <div className="absolute bottom-4 lg:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {sockImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                    index === currentImage 
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
