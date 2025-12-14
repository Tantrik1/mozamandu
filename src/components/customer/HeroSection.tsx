import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-rose-100 via-purple-200 to-indigo-300">
      {/* Large faded brand text in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[20vw] font-black text-white/20 tracking-wider whitespace-nowrap">
          MOZAMANDU
        </span>
      </div>

      {/* Decorative curved shape */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[60%] h-[120%] bg-white/10 rounded-l-full blur-sm" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[60vh]">
          {/* Left content */}
          <div className="text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-zinc-800 leading-tight mb-6">
              <span className="italic font-light">Are you ready to</span>
              <span className="block text-rose-600 italic">step in style</span>
            </h1>

            <p className="text-zinc-600 text-lg max-w-md mb-8 leading-relaxed">
              Premium quality socks crafted with care. Experience unmatched comfort 
              and bold designs for every occasion.
            </p>

            <Button 
              asChild 
              size="lg" 
              className="bg-zinc-100 hover:bg-white text-zinc-900 rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all group"
            >
              <Link to="/categories">
                BUY NOW
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Right - Hero product image */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              <img
                src="/lovable-uploads/9e1dcca9-44bc-44a8-aa02-56cef600abbb.png"
                alt="Premium Mozamandu Socks"
                className="w-full h-auto object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                loading="eager"
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
