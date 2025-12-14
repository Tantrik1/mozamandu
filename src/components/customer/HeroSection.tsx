import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] bg-zinc-950 overflow-hidden flex items-center">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-500/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[150px]" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Floating geometric shapes */}
      <div className="absolute top-20 right-[15%] w-20 h-20 border border-red-500/20 rotate-45 animate-float" />
      <div className="absolute bottom-32 left-[10%] w-16 h-16 border border-white/10 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/3 right-[25%] w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      <div className="absolute bottom-1/3 left-[20%] w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.7s' }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Rating badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full mb-8">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <span className="text-white/70 text-sm">Trusted by 10,000+ customers</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-[0.9] tracking-tight mb-6">
              REDEFINE
              <span className="block bg-gradient-to-r from-red-500 via-orange-500 to-red-400 bg-clip-text text-transparent">
                YOUR STEP
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              Premium socks engineered for the modern lifestyle. 
              Where comfort meets bold design.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="lg" className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-lg px-8 py-7 rounded-full group shadow-lg shadow-red-500/25">
                <Link to="/categories">
                  Explore Collection
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button asChild variant="ghost" size="lg" className="text-white hover:bg-white/10 text-lg px-8 py-7 rounded-full border border-white/20">
                <Link to="/about">
                  Our Story
                </Link>
              </Button>
            </div>
          </div>

          {/* Right side - Abstract sock visual */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative">
              {/* Outer ring */}
              <div className="w-[400px] h-[400px] xl:w-[500px] xl:h-[500px] rounded-full border border-white/10 flex items-center justify-center animate-[spin_30s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/50 rounded-full" />
              </div>
              
              {/* Inner ring */}
              <div className="absolute inset-12 rounded-full border border-white/5 animate-[spin_20s_linear_infinite_reverse]">
                <div className="absolute top-1/2 right-0 translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full" />
              </div>
              
              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl xl:text-9xl font-black bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                    M
                  </div>
                  <div className="text-sm tracking-[0.5em] text-white/50 uppercase mt-2">
                    Mozamandu
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="mt-20 pt-10 border-t border-white/10 grid grid-cols-3 gap-8 max-w-2xl mx-auto lg:mx-0">
          <div className="text-center lg:text-left">
            <div className="text-3xl sm:text-4xl font-bold text-white">50+</div>
            <div className="text-sm text-zinc-500 mt-1">Unique Designs</div>
          </div>
          <div className="text-center lg:text-left">
            <div className="text-3xl sm:text-4xl font-bold text-white">24h</div>
            <div className="text-sm text-zinc-500 mt-1">Fast Delivery</div>
          </div>
          <div className="text-center lg:text-left">
            <div className="text-3xl sm:text-4xl font-bold text-white">100%</div>
            <div className="text-sm text-zinc-500 mt-1">Premium Cotton</div>
          </div>
        </div>
      </div>
    </section>
  );
}
