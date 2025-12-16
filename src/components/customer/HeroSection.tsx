import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import heroSocks from '@/assets/hero-socks.png';

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Step Into Comfort & Style
            </h1>
            <p className="text-lg text-zinc-400 max-w-md mx-auto lg:mx-0 mb-6">
              Premium socks crafted for ultimate comfort and bold design.
            </p>
            <Button 
              asChild 
              size="lg" 
              className="rounded-full px-8 py-6 text-base font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-all group"
            >
              <Link to="/shop">
                Shop Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Right - Hero image */}
          <div className="flex items-center justify-center order-1 lg:order-2">
            <img
              src={heroSocks}
              alt="Premium Mozamandu Socks"
              className="w-full max-w-xs lg:max-w-sm h-auto object-contain"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
