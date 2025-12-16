import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-background via-muted/50 to-primary/5">
      {/* Static background elements - no JS animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[70vh]">
          {/* Left content - CSS animations only */}
          <div className="text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Premium Quality Socks
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6">
              Step Into
              <span className="block text-primary mt-2">Comfort & Style</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Discover our curated collection of premium socks designed for ultimate comfort. 
              Every pair tells a story of quality craftsmanship.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                asChild 
                size="lg" 
                className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all group"
              >
                <Link to="/shop">
                  Shop Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="rounded-full px-8 py-6 text-base font-semibold"
              >
                <Link to="/categories">
                  Explore Categories
                </Link>
              </Button>
            </div>
          </div>

          {/* Right - Hero visual with CSS animations */}
          <div className="relative flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative w-full max-w-lg">
              {/* Floating circles - CSS only */}
              <div className="absolute -top-8 -left-8 w-24 h-24 bg-primary/20 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-accent/20 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
              
              {/* Main image container */}
              <div className="relative bg-gradient-to-br from-muted to-muted/50 rounded-3xl p-8 shadow-2xl">
                <img
                  src="/lovable-uploads/9e1dcca9-44bc-44a8-aa02-56cef600abbb.png"
                  alt="Premium Mozamandu Socks Collection"
                  className="w-full h-auto object-contain drop-shadow-xl"
                  loading="eager"
                  fetchPriority="high"
                  width={400}
                  height={400}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
