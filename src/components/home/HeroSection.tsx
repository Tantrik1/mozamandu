import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
export const HeroSection = memo(function HeroSection() {
  return <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-background via-muted/50 to-primary/5">
      {/* Static background elements - no JS animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '1s'
      }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 pt-20 pb-20 lg:pt-32 lg:pb-24 sm:px-0 py-[16px]">
        
      </div>
    </section>;
});