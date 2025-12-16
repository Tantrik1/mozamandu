import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroBackground from "@/assets/hero-background.webp";

export function HeroSection() {
  return (
    <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
      {/* Hero Background Image - Using img tag for better LCP optimization */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <img
        src={heroBackground}
        alt="Mozamandu Premium Socks Collection"
        className="absolute inset-0 w-full h-full object-cover"
        // @ts-ignore - fetchpriority is a valid HTML attribute
        fetchpriority="high"
        decoding="sync"
        width={1920}
        height={1080}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center px-6 sm:px-10 max-w-[75%] sm:max-w-3xl mx-auto py-8 sm:py-14 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl shadow-black/10">
        {/* H1 - CSS animated entrance */}
        <h1 className="sm:text-4xl font-bold mb-3 sm:mb-4 leading-tight tracking-tight animate-fade-in text-secondary lg:text-7xl text-4xl md:text-6xl">
          Welcome To Mozamandu
        </h1>

        {/* H2 - CSS animated entrance with delay */}
        <p
          style={{
            animationDelay: "0.2s",
            animationFillMode: "backwards",
          }}
          className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed animate-fade-in text-accent"
        >
          Premium socks, boxers & essentials designed for everyday comfort and style.
        </p>

        {/* CTA - CSS animated entrance with delay, touch-optimized */}
        <div
          className="animate-fade-in"
          style={{
            animationDelay: "0.4s",
            animationFillMode: "backwards",
          }}
        >
          <Link to="/shop">
            <Button
              size="lg"
              className="gap-2 px-8 sm:px-10 h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 touch-manipulation"
            >
              Shop Now
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
