import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Star, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EnhancedHeroSection() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const slides = [
    {
      title: "Premium Quality Products",
      subtitle: "Discover our curated collection",
      description: "From comfortable boxers to premium socks and stylish wallets - we have everything you need.",
      cta: "Shop Now",
      gradient: "from-blue-600 via-purple-600 to-indigo-600",
      icon: <Star className="w-6 h-6" />
    },
    {
      title: "Volume Discounts Available",
      subtitle: "Save more when you buy more",
      description: "Enjoy special pricing tiers and combo deals on bulk purchases. Perfect for families and businesses.",
      cta: "See Offers",
      gradient: "from-green-500 via-emerald-500 to-teal-500",
      icon: <TrendingUp className="w-6 h-6" />
    },
    {
      title: "Fast & Reliable Delivery",
      subtitle: "Quick delivery to your doorstep",
      description: "Experience hassle-free shopping with our reliable delivery service across multiple locations.",
      cta: "Learn More",
      gradient: "from-orange-500 via-red-500 to-pink-500",
      icon: <Sparkles className="w-6 h-6" />
    }
  ];

  const currentSlideData = slides[currentSlide];

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gray-900/20 opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Badge */}
          <Badge className={`mb-6 bg-gradient-to-r ${currentSlideData.gradient} text-white border-0 px-6 py-2 text-sm font-medium transform transition-all duration-500 hover:scale-110`}>
            <span className="flex items-center gap-2">
              {currentSlideData.icon}
              Premium Collection
            </span>
          </Badge>

          {/* Main Content */}
          <div className="space-y-6 mb-8">
            <h1 className={`text-5xl md:text-7xl font-bold bg-gradient-to-r ${currentSlideData.gradient} bg-clip-text text-transparent transition-all duration-500`}>
              {currentSlideData.title}
            </h1>
            
            <h2 className="text-xl md:text-2xl text-gray-300 font-medium">
              {currentSlideData.subtitle}
            </h2>
            
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {currentSlideData.description}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate('/categories')}
              className={`bg-gradient-to-r ${currentSlideData.gradient} hover:opacity-90 text-white border-0 px-8 py-4 text-lg font-semibold rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
            >
              <span className="flex items-center gap-2">
                {currentSlideData.cta}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/about')}
              className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-4 text-lg font-semibold rounded-xl transform transition-all duration-300 hover:scale-105"
            >
              Learn More
            </Button>
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-white scale-125' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-10 w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl opacity-20 animate-bounce"></div>
      <div className="absolute bottom-1/4 right-10 w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full blur-xl opacity-20 animate-bounce" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-20 animate-bounce" style={{ animationDelay: '2s' }}></div>
    </section>
  );
}