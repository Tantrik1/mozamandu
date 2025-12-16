import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import heroSocks from '@/assets/hero-socks.png';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-white/5 to-transparent rounded-full" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[90vh]">
          {/* Left content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6 border border-white/10">
              <Sparkles className="w-4 h-4 text-primary" />
              Premium Quality Socks
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-6">
              Step Into
              <span className="block bg-gradient-to-r from-primary via-rose-400 to-orange-400 bg-clip-text text-transparent mt-2">
                Comfort & Style
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Premium socks crafted for ultimate comfort. Every pair tells a story of quality craftsmanship and bold design.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                asChild 
                size="lg" 
                className="rounded-full px-8 py-6 text-base font-semibold bg-white text-zinc-900 hover:bg-zinc-100 shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all group"
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
                className="rounded-full px-8 py-6 text-base font-semibold border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                <Link to="/shop">
                  Explore Collection
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-white">10K+</div>
                <div className="text-sm text-zinc-500">Happy Customers</div>
              </div>
              <div className="w-px h-12 bg-zinc-700" />
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-white">50+</div>
                <div className="text-sm text-zinc-500">Unique Styles</div>
              </div>
              <div className="w-px h-12 bg-zinc-700" />
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-white">100%</div>
                <div className="text-sm text-zinc-500">Premium Cotton</div>
              </div>
            </div>
          </div>

          {/* Right - Hero image */}
          <div className="relative flex items-center justify-center order-1 lg:order-2">
            {/* Glow effect behind image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[80%] h-[80%] bg-gradient-to-br from-primary/30 via-rose-500/20 to-orange-500/20 rounded-full blur-3xl" />
            </div>
            
            {/* Main image */}
            <div className="relative">
              <img
                src={heroSocks}
                alt="Premium Mozamandu Socks"
                className="w-full max-w-lg h-auto object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-700"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
