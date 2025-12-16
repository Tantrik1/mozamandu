import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroBackground from "@/assets/hero-background.png";
export function HeroSection() {
  return <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden" style={{
    backgroundImage: `url(${heroBackground})`,
    backgroundSize: "cover",
    backgroundPosition: "center"
  }}>
      {/* Glass + gradient overlay for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/70 backdrop-blur-[2px]" />

      {/* Content with glassmorphism */}
      <div className="relative z-10 text-center sm:px-10 max-w-3xl mx-auto py-10 sm:py-14 bg-background/30 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl shadow-black/5 px-[8px]">
        {/* H1 - CSS animated entrance */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 sm:mb-4 leading-tight tracking-tight animate-fade-in">
          Step Into Comfort
        </h1>

        {/* H2 - CSS animated entrance with delay */}
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed animate-fade-in" style={{
        animationDelay: "0.2s",
        animationFillMode: "backwards"
      }}>
          Premium socks, boxers & essentials designed for everyday comfort and style.
        </p>

        {/* CTA - CSS animated entrance with delay, touch-optimized */}
        <div className="animate-fade-in" style={{
        animationDelay: "0.4s",
        animationFillMode: "backwards"
      }}>
          <Link to="/shop">
            <Button size="lg" className="gap-2 px-8 sm:px-10 h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 touch-manipulation">
              Shop Now
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>;
}