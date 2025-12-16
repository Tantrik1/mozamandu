import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroBackground from "@/assets/hero-background.webp";
export function HeroSection() {
  return (
    <section className="relative h-[60vh] min-h-[320px] max-h-[500px] md:h-[60vh] md:min-h-[300px] md:max-h-[400px] lg:h-[70vh] lg:min-h-[600px] lg:max-h-[650px] flex items-center justify-center overflow-hidden">
      {/* Hero Background Image - Using img tag for better LCP optimization */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <img
        alt="Mozamandu Premium Socks Collection"
        // @ts-ignore - fetchpriority is a valid HTML attribute
        fetchpriority="high"
        decoding="sync"
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover object-center md:object-center"
        src="/lovable-uploads/9fa2db76-897b-4d35-a08b-c01f9668b543.webp"
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 sm:px-10 max-w-[75%] sm:max-w-3xl mx-auto py-8 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl shadow-black/10 sm:py-[37px]">
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
