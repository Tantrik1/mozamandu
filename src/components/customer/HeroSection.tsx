import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import heroBackground from '@/assets/hero-background.png';

export function HeroSection() {
  return (
    <section 
      className="relative h-[50vh] min-h-[320px] max-h-[500px] flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Soft overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/40" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Badge */}
        <Badge 
          variant="secondary" 
          className="mb-4 px-4 py-1.5 text-xs font-medium bg-white/80 backdrop-blur-sm border border-border/50"
        >
          Premium Quality Essentials
        </Badge>
        
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
          Step Into Comfort <br className="hidden sm:block" />
          & Style
        </h1>
        
        {/* Description */}
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg mb-6 max-w-md mx-auto leading-relaxed">
          Discover our collection of premium socks, boxers, and accessories designed for everyday comfort.
        </p>
        
        {/* CTA Button */}
        <Link to="/shop">
          <Button 
            size="lg" 
            className="gap-2 px-8 h-12 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Shop Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
